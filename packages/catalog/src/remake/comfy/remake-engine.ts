import type { EngineBinding, RunInputs } from "@rosesfield/contract"
import type { AssetId, CharacterId } from "@rosesfield/kernel"
import { recastAspectRatios, recastEngine } from "#recast/comfy/recast-engine"
import {
  type PlannedShot,
  remakeLimits,
  shotSecondsOf,
} from "#remake/shot-plan"
import { app as videoApp } from "#video/app"

export type RemakeQuality = "draft" | "final"

export type ShotAttempt = 1 | 2

export type ShotApp = "recast" | "video"

export type ShotRequest = {
  shot: number
  app: ShotApp
  idempotencyKey: string
  binding: EngineBinding
  inputs: RunInputs
  aspectRatio: string
  seed: number
}

export type ShotRequestInput = {
  runId: string
  attempt: ShotAttempt
  shot: PlannedShot
  clip: AssetId | null
  character: CharacterId
  quality: RemakeQuality
  instructions: string
  aspectRatio: string
  seed: number
}

type Routed = {
  app: ShotApp
  binding: EngineBinding
  inputs: RunInputs
}

export const remakeShotsAdapter = "remake-shots"

export const remakeAspectRatios: readonly string[] = [...recastAspectRatios]

const seedSpan = 2_147_483_648

const rebuildVideo: Readonly<Record<RemakeQuality, RunInputs>> = {
  draft: { model: "ltx-2-5", resolution: "480p", sound: "off" },
  final: { model: "ltx-2-5", resolution: "720p", sound: "off" },
}

export const remakeEngine: EngineBinding = {
  adapter: remakeShotsAdapter,
  config: { replace: recastEngine, rebuild: videoApp.engine },
}

export function shotKeyOf(
  runId: string,
  shot: number,
  attempt: ShotAttempt
): string {
  return `${runId}-shot-${shot}-attempt-${attempt}`
}

export function shotSeedOf(seed: number, shot: number): number {
  return (seed + shot - 1) % seedSpan
}

export function rebuildLengthOf(shot: PlannedShot): number {
  return Math.max(
    remakeLimits.shortestRebuildSeconds,
    Math.ceil(shotSecondsOf(shot))
  )
}

function wordsOf(shot: PlannedShot, instructions: string): string {
  const words = shot.words ?? ""
  const added = instructions.trim()
  return added === "" ? words : `${words} ${added}`.trim()
}

function replaced(input: ShotRequestInput): Routed | null {
  if (input.clip === null) {
    return null
  }
  return {
    app: "recast",
    binding: recastEngine,
    inputs: {
      mode: "character",
      source: [input.clip],
      character: [input.character],
      keepSound: "off",
      quality: input.quality,
    },
  }
}

function rebuilt(input: ShotRequestInput): Routed {
  return {
    app: "video",
    binding: videoApp.engine,
    inputs: {
      prompt: wordsOf(input.shot, input.instructions),
      length: rebuildLengthOf(input.shot),
      cameraMove: input.shot.cameraMove ?? "auto",
      ...rebuildVideo[input.quality],
    },
  }
}

function routed(input: ShotRequestInput): Routed | null {
  switch (input.shot.route) {
    case "keep":
      return null
    case "rebuild":
      return rebuilt(input)
    case "replace":
      return replaced(input)
  }
}

export function shotRequestOf(input: ShotRequestInput): ShotRequest | null {
  const shot = routed(input)
  if (shot === null) {
    return null
  }
  return {
    shot: input.shot.number,
    app: shot.app,
    idempotencyKey: shotKeyOf(input.runId, input.shot.number, input.attempt),
    binding: shot.binding,
    inputs: shot.inputs,
    aspectRatio: input.aspectRatio,
    seed: shotSeedOf(input.seed, input.shot.number),
  }
}
