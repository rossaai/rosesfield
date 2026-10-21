import type { Cost, EngineBinding, RunInputs } from "@rosesfield/contract"
import {
  type EngineFile,
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineStepJob,
  type EngineSteps,
  EngineUnavailableError,
  type GenerationEngine,
  RunFailedError,
  type RunPlan,
} from "@rosesfield/generation"
import {
  type AssetId,
  ProjectError,
  RateLimitedError,
} from "@rosesfield/kernel"
import {
  type RemakeQuality,
  remakeAspectRatios,
  type ShotRequest,
} from "#remake/comfy/remake-engine"
import type { ReferenceProbe } from "#remake/ffmpeg/ffmpeg-probe"
import type { MediaFile } from "#remake/media-tool.port"
import type { FoundShot, OtherShots, PlannedShot } from "#remake/shot-plan"

export type RemakeSettings = {
  quality: RemakeQuality
  otherShots: OtherShots
  keepSound: boolean
  instructions: string
  aspectRatio: string
  seed: number
}

export type RemakeStage =
  | "planning"
  | "making"
  | "joining"
  | "done"
  | "failed"
  | "cancelled"

export type ShotRun = {
  request: ShotRequest
  binding: EngineBinding
  engine: GenerationEngine
  clip: AssetId | null
  estimate: number | null
}

export type ShotWork = {
  shot: PlannedShot
  run: ShotRun | null
  ref: string | null
  made: EngineOutput | null
  cost: Cost | null
}

export type RemakeJob = {
  ref: string
  settings: RemakeSettings
  reference: MediaFile
  photo: EngineFile
  found: readonly FoundShot[]
  probe: ReferenceProbe
  stage: RemakeStage
  works: ShotWork[]
  costs: Cost[]
  output: EngineOutput | null
  error: ProjectError | null
  isBusy: boolean
}

const defaultAspectRatio = "16:9"

const referenceExtensions: Readonly<Record<string, string>> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
}

function textOf(inputs: RunInputs, name: string, fallback: string): string {
  const value = inputs[name]
  return typeof value === "string" ? value : fallback
}

function firstIdOf(inputs: RunInputs, name: string): string | null {
  const value = inputs[name]
  return Array.isArray(value) ? (value[0] ?? null) : null
}

export function settingsOf(request: EngineRequest): RemakeSettings {
  const { inputs } = request
  const ratio = request.aspectRatio
  return {
    quality: textOf(inputs, "quality", "draft") === "final" ? "final" : "draft",
    otherShots:
      textOf(inputs, "otherShots", "rebuild") === "keep" ? "keep" : "rebuild",
    keepSound: textOf(inputs, "keepSound", "on") === "on",
    instructions: textOf(inputs, "instructions", ""),
    aspectRatio:
      ratio !== null && remakeAspectRatios.includes(ratio)
        ? ratio
        : defaultAspectRatio,
    seed: request.seed ?? 0,
  }
}

export function fileOf(request: EngineRequest, name: string): EngineFile {
  const id = firstIdOf(request.inputs, name)
  const file = request.files.find((one) => one.assetId === id)
  if (file === undefined) {
    throw new RunFailedError({ cause: `the run holds no file for ${name}` })
  }
  return file
}

export function referenceOf(file: EngineFile): MediaFile {
  return {
    name: `reference${referenceExtensions[file.mime] ?? ".mp4"}`,
    bytes: file.bytes,
  }
}

export function madeNameOf(work: ShotWork): string {
  return `shot-${work.shot.number}.mp4`
}

export function isRetryable(error: unknown): boolean {
  return (
    error instanceof RateLimitedError || error instanceof EngineUnavailableError
  )
}

export function projectErrorOf(error: unknown): ProjectError {
  return error instanceof ProjectError
    ? error
    : new RunFailedError({ cause: error })
}

export function isMade(work: ShotWork): boolean {
  return work.shot.route === "keep" || work.made !== null
}

export function isWorking(stage: RemakeStage): boolean {
  return stage === "planning" || stage === "making" || stage === "joining"
}

export function isInFlight(work: ShotWork): boolean {
  return work.ref !== null && work.made === null
}

function costOf(costs: readonly Cost[]): Cost | null {
  return costs.length === 0
    ? null
    : {
        amount: costs.reduce((total, cost) => total + cost.amount, 0),
        currency: "USD",
      }
}

function creditsOf(work: ShotWork): number | null {
  const { run, cost } = work
  if (run === null) {
    return null
  }
  const measured = cost === null ? null : run.engine.creditsOf(cost)
  return measured ?? run.estimate
}

function modelOf(work: ShotWork): string | null {
  const model = work.run?.request.inputs.model
  return typeof model === "string" && model !== "" ? model : null
}

export function planShotOf(work: ShotWork): RunPlan["shots"][number] {
  const { shot } = work
  return {
    number: shot.number,
    startSeconds: shot.startSeconds,
    endSeconds: shot.endSeconds,
    route: shot.route,
    model: modelOf(work),
    credits: creditsOf(work),
    seed: work.run?.request.seed ?? null,
    words: shot.words,
    cameraMove: shot.cameraMove,
  }
}

function stepJobsOf(work: ShotWork): EngineStepJob[] {
  const { run, ref } = work
  return run === null || ref === null
    ? []
    : [{ number: work.shot.number, engine: run.engine.key, ref }]
}

export function stepsOf(job: RemakeJob): { steps?: EngineSteps } {
  if (job.works.length === 0) {
    return {}
  }
  return {
    steps: {
      plan: { shots: job.works.map(planShotOf) },
      jobs: job.works.flatMap(stepJobsOf),
    },
  }
}

export function statusOf(job: RemakeJob): EngineStatus {
  switch (job.stage) {
    case "done":
      return { state: "succeeded", cost: costOf(job.costs), ...stepsOf(job) }
    case "failed":
      return {
        state: "failed",
        error: job.error ?? new RunFailedError({ cause: "no reason kept" }),
      }
    case "cancelled":
      return { state: "cancelled" }
    default: {
      const shots = job.works.filter((work) => work.shot.route !== "keep")
      const made = shots.filter((work) => work.made !== null).length
      return {
        state: "running",
        progress: shots.length === 0 ? null : made / shots.length,
        retryAfterSeconds: null,
        ...stepsOf(job),
      }
    }
  }
}

export function sizeOf(job: RemakeJob): { width: number; height: number } {
  for (const work of job.works) {
    const width = work.made?.width ?? null
    const height = work.made?.height ?? null
    if (width !== null && height !== null) {
      return { width, height }
    }
  }
  const { width, height } = job.probe
  if (width === null || height === null) {
    throw new RunFailedError({ cause: "the reference edit has no picture" })
  }
  return { width, height }
}
