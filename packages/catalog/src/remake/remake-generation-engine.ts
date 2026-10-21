import type { Cost, EngineBinding, KeyCheck } from "@rosesfield/contract"
import {
  type EngineFile,
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  EngineUnavailableError,
  GenerationEngine,
  type OutputsPerJob,
  type PriceBook,
  RunFailedError,
} from "@rosesfield/generation"
import type { ProjectError } from "@rosesfield/kernel"
import { creditsOfCost } from "#comfy/comfy-credits"
import { remakeShotsAdapter } from "#remake/comfy/remake-engine"
import { planModel, planReplyOf } from "#remake/comfy/remake-plan-turn"
import type { RouterPlanTurn } from "#remake/comfy/router-plan-turn"
import type { MediaTool } from "#remake/media-tool.port"
import {
  fileOf,
  isInFlight,
  isMade,
  isRetryable,
  isWorking,
  projectErrorOf,
  type RemakeJob,
  type RemakeStage,
  referenceOf,
  type ShotRun,
  type ShotWork,
  settingsOf,
  statusOf,
} from "#remake/remake-job"
import { RemakeMedia } from "#remake/remake-media"
import { shortestSwapSecondsOf } from "#remake/shot-padding"
import { type PlannedShot, planShots } from "#remake/shot-plan"
import { ShotWorks } from "#remake/shot-works"

type RemakeGenerationEngineOptions = {
  engines: readonly GenerationEngine[]
  media: MediaTool
  plan: RouterPlanTurn
  prices?: PriceBook
}

export class RemakeGenerationEngine extends GenerationEngine {
  override readonly key = remakeShotsAdapter
  override readonly origin = "live"
  override readonly idempotency = "keyed"

  private readonly engines: readonly GenerationEngine[]
  private readonly media: RemakeMedia
  private readonly plan: RouterPlanTurn
  private readonly works: ShotWorks
  private readonly jobs = new Map<string, RemakeJob>()

  constructor(options: RemakeGenerationEngineOptions) {
    super()
    this.engines = options.engines
    this.media = new RemakeMedia(options.media)
    this.plan = options.plan
    this.works = new ShotWorks({
      engines: options.engines,
      ...(options.prices === undefined ? {} : { prices: options.prices }),
    })
  }

  override holds(ref: string): boolean {
    return this.jobs.has(ref)
  }

  override canRun(binding: EngineBinding): boolean {
    return binding.adapter === remakeShotsAdapter
  }

  override outputsPerJob(_binding: EngineBinding): OutputsPerJob {
    return "all"
  }

  override checksKey(): boolean {
    return false
  }

  override async checkKey(): Promise<KeyCheck> {
    const [first] = this.engines
    return first === undefined ? "unreachable" : first.checkKey()
  }

  override submitLimitMs(): number {
    return 2 * this.media.limitMs()
  }

  override creditsOf(cost: Cost): number {
    return creditsOfCost(cost)
  }

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    const ref = `${remakeShotsAdapter}|${request.idempotencyKey}`
    if (!this.jobs.has(ref)) {
      this.jobs.set(ref, await this.open(ref, request))
    }
    return { ref, models: [planModel], workflowHash: null }
  }

  override async read(ref: string): Promise<EngineStatus> {
    const job = this.jobs.get(ref)
    if (job === undefined) {
      return {
        state: "failed",
        error: new RunFailedError({
          cause: "this server holds no Remake run with this ref",
        }),
      }
    }
    if (!job.isBusy && isWorking(job.stage)) {
      job.isBusy = true
      try {
        await this.step(job)
      } catch (error) {
        if (!isRetryable(error)) {
          await this.fail(job, projectErrorOf(error))
        }
      } finally {
        job.isBusy = false
      }
    }
    return statusOf(job)
  }

  override async listOutputs(ref: string): Promise<EngineOutput[]> {
    const output = this.jobs.get(ref)?.output ?? null
    if (output === null) {
      throw new EngineUnavailableError({ cause: "the Remake is not joined" })
    }
    this.jobs.delete(ref)
    return [output]
  }

  override async cancel(ref: string): Promise<void> {
    const job = this.jobs.get(ref)
    if (job === undefined || !isWorking(job.stage)) {
      return
    }
    job.stage = "cancelled"
    await this.stopShots(job)
  }

  private async open(ref: string, request: EngineRequest): Promise<RemakeJob> {
    const reference = referenceOf(fileOf(request, "reference"))
    const photo = fileOf(request, "character")
    const { found, probe } = await this.media.findShots(reference)
    const job: RemakeJob = {
      ref,
      settings: settingsOf(request),
      reference,
      photo,
      found,
      probe,
      stage: "planning",
      works: [],
      costs: [],
      output: null,
      error: null,
      isBusy: false,
    }
    if (request.steps !== undefined) {
      job.works = await this.works.restored(job, request.steps)
      job.stage = "making"
    }
    return job
  }

  private async step(job: RemakeJob): Promise<void> {
    switch (job.stage) {
      case "planning":
        return this.planOf(job)
      case "making":
        return this.make(job)
      case "joining":
        return this.join(job)
      default:
        return
    }
  }

  private async planOf(job: RemakeJob): Promise<void> {
    const frames = await this.media.framesOf(job.reference, job.found)
    const turn = await this.plan.ask(
      { frames, instructions: job.settings.instructions },
      `${job.ref}-plan`
    )
    if (turn.cost !== null) {
      job.costs.push(turn.cost)
    }
    const planned = planShots(
      job.found,
      planReplyOf(turn.answer),
      job.settings.otherShots
    )
    if (planned === null) {
      throw new RunFailedError({
        cause: "the plan turn gave no usable entry for each shot",
      })
    }
    const works = await this.works.planned(job, planned)
    if (this.isStopped(job, "planning")) {
      return
    }
    job.works = works
    job.stage = "making"
  }

  private async make(job: RemakeJob): Promise<void> {
    for (const work of job.works.filter(isInFlight)) {
      await this.collect(job, work)
      if (this.isStopped(job, "making")) {
        return
      }
    }
    for (const work of job.works) {
      if (isMade(work) || work.ref !== null) {
        continue
      }
      const isWaiting = job.works.some(
        (one) => isInFlight(one) && one.run?.engine.submitsAlone() === true
      )
      if (isWaiting) {
        return
      }
      await this.submitShot(job, work)
      if (this.isStopped(job, "making")) {
        return
      }
    }
    if (job.works.every(isMade)) {
      job.stage = "joining"
    }
  }

  private async submitShot(job: RemakeJob, work: ShotWork): Promise<void> {
    const { run } = work
    if (run === null) {
      return
    }
    const submission = await this.sendShot(job, work.shot, run)
    work.ref = submission.ref
    const { finished } = submission
    if (finished !== undefined) {
      this.keep(job, work, finished.outputs, finished.cost)
    }
    if (job.stage === "cancelled") {
      await run.engine.cancel(submission.ref).catch(() => undefined)
    }
  }

  private async sendShot(
    job: RemakeJob,
    shot: PlannedShot,
    run: ShotRun
  ): Promise<EngineSubmission> {
    const { request, binding, engine } = run
    const files = await this.filesOf(job, shot, run)
    return engine.submit({
      idempotencyKey: request.idempotencyKey,
      binding,
      inputs: request.inputs,
      files,
      count: 1,
      aspectRatio: request.aspectRatio,
      seed: request.seed,
      outputKind: "video",
    })
  }

  private async filesOf(
    job: RemakeJob,
    shot: PlannedShot,
    run: ShotRun
  ): Promise<EngineFile[]> {
    const { clip, engine, binding } = run
    if (clip === null) {
      return []
    }
    const shortest = shortestSwapSecondsOf(await engine.formOf(binding))
    const made = await this.media.clipOf(job.reference, shot, shortest, clip)
    return [job.photo, made]
  }

  private async collect(job: RemakeJob, work: ShotWork): Promise<void> {
    const { run, ref } = work
    if (run === null || ref === null) {
      return
    }
    const { engine } = run
    const status = await engine.read(ref)
    switch (status.state) {
      case "succeeded": {
        const outputs = await engine.listOutputs(ref, run.request.inputs)
        this.keep(job, work, outputs, status.cost ?? null)
        return
      }
      case "failed":
        await this.fail(job, status.error)
        return
      case "cancelled":
        job.stage = "cancelled"
        await this.stopShots(job)
        return
      default:
        return
    }
  }

  private keep(
    job: RemakeJob,
    work: ShotWork,
    outputs: readonly EngineOutput[],
    cost: Cost | null
  ): void {
    const video = outputs.find((output) => output.kind === "video")
    if (video === undefined) {
      throw new RunFailedError({
        cause: `shot ${work.shot.number} made no video`,
      })
    }
    work.made = video
    work.cost = cost
    if (cost !== null) {
      job.costs.push(cost)
    }
  }

  private async join(job: RemakeJob): Promise<void> {
    const output = await this.media.join(job)
    if (this.isStopped(job, "joining")) {
      return
    }
    job.output = output
    job.works = job.works.map((work) => ({ ...work, made: null }))
    job.stage = "done"
  }

  private isStopped(job: RemakeJob, stage: RemakeStage): boolean {
    return job.stage !== stage
  }

  private async fail(job: RemakeJob, error: ProjectError): Promise<void> {
    job.stage = "failed"
    job.error = error
    await this.stopShots(job)
  }

  private async stopShots(job: RemakeJob): Promise<void> {
    await Promise.allSettled(
      job.works.flatMap((work) =>
        work.run === null || work.ref === null || !isInFlight(work)
          ? []
          : [work.run.engine.cancel(work.ref)]
      )
    )
  }
}
