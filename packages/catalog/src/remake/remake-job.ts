import type { Cost, RunInputs } from "@rosesfield/contract"
import {
  type EngineFile,
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  EngineUnavailableError,
  type GenerationEngine,
  RunFailedError,
} from "@rosesfield/generation"
import { ProjectError, RateLimitedError } from "@rosesfield/kernel"
import {
  type RemakeQuality,
  remakeAspectRatios,
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

export type ShotWork = {
  shot: PlannedShot
  engine: GenerationEngine | null
  ref: string | null
  inputs: RunInputs
  made: EngineOutput | null
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

export function statusOf(job: RemakeJob): EngineStatus {
  switch (job.stage) {
    case "done":
      return { state: "succeeded", cost: costOf(job.costs) }
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
