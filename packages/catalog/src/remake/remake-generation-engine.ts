import type { Cost, EngineBinding, KeyCheck } from "@rosesfield/contract"
import {
  EngineBindingInvalidError,
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  EngineUnavailableError,
  GenerationEngine,
  type OutputsPerJob,
  RunFailedError,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat, type ProjectError } from "@rosesfield/kernel"
import { creditsOfCost } from "#comfy/comfy-credits"
import { remakeShotsAdapter, shotRequestOf } from "#remake/comfy/remake-engine"
import {
  type PlanFrame,
  planModel,
  planReplyOf,
} from "#remake/comfy/remake-plan-turn"
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
  type ShotWork,
  settingsOf,
  statusOf,
} from "#remake/remake-job"
import { RemakeMedia } from "#remake/remake-media"
import { shortestSwapSecondsOf } from "#remake/shot-padding"
import { planShots } from "#remake/shot-plan"

type RemakeGenerationEngineOptions = {
  engines: readonly GenerationEngine[]
  media: MediaTool
  plan: RouterPlanTurn
}

type Shot = {
  engine: GenerationEngine
  submission: EngineSubmission
}

export class RemakeGenerationEngine extends GenerationEngine {
  override readonly key = remakeShotsAdapter
  override readonly origin = "live"
  override readonly idempotency = "keyed"

  private readonly engines: readonly GenerationEngine[]
  private readonly media: RemakeMedia
  private readonly plan: RouterPlanTurn
  private readonly jobs = new Map<string, RemakeJob>()

  constructor(options: RemakeGenerationEngineOptions) {
    super()
    this.engines = options.engines
    this.media = new RemakeMedia(options.media)
    this.plan = options.plan
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
    return {
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
    const frames: PlanFrame[] = []
    for (const shot of job.found) {
      frames.push(await this.media.frameOf(job.reference, shot))
    }
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
    if (this.isStopped(job, "planning")) {
      return
    }
    job.works = planned.map((shot) => ({
      shot,
      engine: null,
      ref: null,
      inputs: {},
      made: null,
    }))
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
        (one) => isInFlight(one) && one.engine?.submitsAlone() === true
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
    const shot = await this.sendShot(job, work)
    work.engine = shot.engine
    work.ref = shot.submission.ref
    const { finished } = shot.submission
    if (finished !== undefined) {
      this.keep(job, work, finished.outputs, finished.cost)
    }
    if (job.stage === "cancelled") {
      await shot.engine.cancel(shot.submission.ref).catch(() => undefined)
    }
  }

  private async sendShot(job: RemakeJob, work: ShotWork): Promise<Shot> {
    const { settings } = job
    const clip = assetIdFormat.parse(crypto.randomUUID())
    const isReplaced = work.shot.route === "replace"
    const request = shotRequestOf({
      runId: job.ref,
      attempt: 1,
      shot: work.shot,
      clip: isReplaced ? clip : null,
      photo: job.photo.assetId,
      quality: settings.quality,
      instructions: settings.instructions,
      aspectRatio: settings.aspectRatio,
      seed: settings.seed,
    })
    if (request === null) {
      throw new RunFailedError({ cause: `shot ${work.shot.number} has no run` })
    }
    const binding = resolveBinding(request.binding, request.inputs)
    const engine = this.engines.find((one) => one.canRun(binding))
    if (engine === undefined) {
      throw new EngineBindingInvalidError({
        adapter: binding.adapter,
        reason: "no engine on this server runs this shot",
      })
    }
    const shortest = isReplaced
      ? shortestSwapSecondsOf(await engine.formOf(binding))
      : 0
    const files = isReplaced
      ? [
          job.photo,
          await this.media.clipOf(job.reference, work.shot, shortest, clip),
        ]
      : []
    work.inputs = request.inputs
    const submission = await engine.submit({
      idempotencyKey: request.idempotencyKey,
      binding,
      inputs: request.inputs,
      files,
      count: 1,
      aspectRatio: request.aspectRatio,
      seed: request.seed,
      outputKind: "video",
    })
    return { engine, submission }
  }

  private async collect(job: RemakeJob, work: ShotWork): Promise<void> {
    const { engine, ref } = work
    if (engine === null || ref === null) {
      return
    }
    const status = await engine.read(ref)
    switch (status.state) {
      case "succeeded": {
        const outputs = await engine.listOutputs(ref, work.inputs)
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
        work.engine === null || !isInFlight(work)
          ? []
          : [work.engine.cancel(work.ref ?? "")]
      )
    )
  }
}
