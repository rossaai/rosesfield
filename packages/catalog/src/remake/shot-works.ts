import type { AppDefinition } from "@rosesfield/contract"
import {
  AppCatalog,
  EngineBindingInvalidError,
  type EngineSteps,
  type GenerationEngine,
  type PriceBook,
  PriceRunHandler,
  type RunPlan,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { readApps } from "#list-apps"
import { app as motionApp } from "#motion/app"
import { shotRequestOf } from "#remake/comfy/remake-engine"
import type { RemakeJob, ShotRun, ShotWork } from "#remake/remake-job"
import type { PlannedShot } from "#remake/shot-plan"
import { app as videoApp } from "#video/app"
import { cameraMoves } from "#video/camera-moves"

type ShotWorksOptions = {
  engines: readonly GenerationEngine[]
  prices?: PriceBook
}

class ShotApps extends AppCatalog {
  private readonly apps: readonly AppDefinition[] = readApps([
    { folder: "motion", app: motionApp },
    { folder: "video", app: videoApp },
  ])

  override find(appId: string): AppDefinition | null {
    return this.apps.find((app) => app.id === appId) ?? null
  }
}

function cameraMoveOf(value: string | null): PlannedShot["cameraMove"] {
  return cameraMoves.find((move) => move.value === value)?.value ?? null
}

export function plannedOf(shot: RunPlan["shots"][number]): PlannedShot {
  return {
    number: shot.number,
    startSeconds: shot.startSeconds,
    endSeconds: shot.endSeconds,
    people: shot.route === "replace" ? "one" : "none",
    route: shot.route,
    words: shot.route === "rebuild" ? shot.words : null,
    cameraMove: shot.route === "rebuild" ? cameraMoveOf(shot.cameraMove) : null,
  }
}

export class ShotWorks {
  private readonly engines: readonly GenerationEngine[]
  private readonly prices: PriceRunHandler

  constructor(options: ShotWorksOptions) {
    this.engines = options.engines
    this.prices = new PriceRunHandler({
      apps: new ShotApps(),
      engines: options.engines,
      ...(options.prices === undefined ? {} : { prices: options.prices }),
    })
  }

  async planned(
    job: RemakeJob,
    shots: readonly PlannedShot[]
  ): Promise<ShotWork[]> {
    return Promise.all(shots.map((shot) => this.workOf(job, shot)))
  }

  async restored(job: RemakeJob, steps: EngineSteps): Promise<ShotWork[]> {
    const works = await this.planned(job, steps.plan.shots.map(plannedOf))
    return works.map((work) => {
      const kept = steps.jobs.find((one) => one.number === work.shot.number)
      return kept === undefined || kept.engine !== work.run?.engine.key
        ? work
        : { ...work, ref: kept.ref }
    })
  }

  private async workOf(job: RemakeJob, shot: PlannedShot): Promise<ShotWork> {
    const run = await this.runOf(job, shot)
    return { shot, run, ref: null, made: null, cost: null }
  }

  private async runOf(
    job: RemakeJob,
    shot: PlannedShot
  ): Promise<ShotRun | null> {
    const { settings } = job
    const isReplaced = shot.route === "replace"
    const clip = isReplaced ? assetIdFormat.parse(crypto.randomUUID()) : null
    const request = shotRequestOf({
      runId: job.ref,
      attempt: 1,
      shot,
      clip,
      photo: job.photo.assetId,
      quality: settings.quality,
      instructions: settings.instructions,
      aspectRatio: settings.aspectRatio,
      seed: settings.seed,
    })
    if (request === null) {
      return null
    }
    const binding = resolveBinding(request.binding, request.inputs)
    const engine = this.engines.find((one) => one.canRun(binding))
    if (engine === undefined) {
      throw new EngineBindingInvalidError({
        adapter: binding.adapter,
        reason: `no engine on this server runs shot ${shot.number}`,
      })
    }
    const priced = await this.prices
      .execute({
        appId: request.app,
        inputs: request.inputs,
        count: 1,
        aspectRatio: request.aspectRatio,
      })
      .catch(() => null)
    return {
      request,
      binding,
      engine,
      clip,
      estimate: priced?.price.credits ?? null,
    }
  }
}
