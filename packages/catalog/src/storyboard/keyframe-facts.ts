import type { Run } from "@rosesfield/contract"
import {
  maxScenes,
  sceneInputName,
  sceneNumbers,
} from "#storyboard/storyboard-inputs"

export type KeyframeAnchor =
  | { kind: "scene" }
  | { kind: "keyframe"; number: 1; labelKey: "storyboard.anchor.keyframe" }
  | { kind: "reference"; assetId: string }
  | { kind: "character"; characterId: string }

export type KeyframeFacts = {
  number: number
  assetId: string | null
  scene: string
  prompt: string
  seed: number | null
  anchor: KeyframeAnchor
}

export type KeyframeRun = Pick<
  Run,
  "appId" | "inputs" | "count" | "seed" | "outputs"
>

export const storyboardAppId = "storyboard"

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function firstIdOf(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null
  }
  const [first] = value
  return typeof first === "string" ? first : null
}

function anchorOf(run: KeyframeRun, number: number): KeyframeAnchor {
  const reference = firstIdOf(run.inputs.reference)
  if (reference !== null) {
    return { kind: "reference", assetId: reference }
  }
  const character = firstIdOf(run.inputs.character)
  if (character !== null) {
    return { kind: "character", characterId: character }
  }
  return number === 1
    ? { kind: "scene" }
    : { kind: "keyframe", number: 1, labelKey: "storyboard.anchor.keyframe" }
}

export function keyframesOf(run: KeyframeRun): KeyframeFacts[] {
  if (run.appId !== storyboardAppId) {
    return []
  }
  const look = textOf(run.inputs.look)
  const count = Math.min(Math.max(run.count, 1), maxScenes)
  return sceneNumbers.slice(0, count).map((number) => {
    const scene = textOf(run.inputs[sceneInputName(number)])
    return {
      number,
      assetId: run.outputs[number - 1] ?? null,
      scene,
      prompt: [scene, look].filter((part) => part !== "").join(" "),
      seed: run.seed === null ? null : run.seed + number - 1,
      anchor: anchorOf(run, number),
    }
  })
}

export function keyframeOf(
  run: KeyframeRun,
  assetId: string
): KeyframeFacts | null {
  return keyframesOf(run).find((one) => one.assetId === assetId) ?? null
}
