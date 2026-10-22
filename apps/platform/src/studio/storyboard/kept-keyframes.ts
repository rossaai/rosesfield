import {
  type KeptKeyframe,
  keyframeInput,
  keyframeNumberOf,
} from "@rosesfield/catalog/storyboard"
import { type Run, runInputs } from "@rosesfield/contract"

const storageKey = "rosesfield.storyboard.keyframes"

const keptRuns = 400

let kept: Map<string, KeptKeyframe> | null = null

function keptOf(value: unknown): KeptKeyframe | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  const press = "press" in value ? value.press : null
  const inputs = runInputs.safeParse("inputs" in value ? value.inputs : null)
  return typeof press === "string" && inputs.success
    ? { press, inputs: inputs.data }
    : null
}

function read(): Map<string, KeptKeyframe> {
  const found = new Map<string, KeptKeyframe>()
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(storageKey) ?? "[]"
    )
    for (const entry of Array.isArray(stored) ? stored : []) {
      const [runId, value] = Array.isArray(entry) ? entry : []
      const keyframe = keptOf(value)
      if (typeof runId === "string" && keyframe !== null) {
        found.set(runId, keyframe)
      }
    }
  } catch {
    return found
  }
  return found
}

function keptMap(): Map<string, KeptKeyframe> {
  kept ??= read()
  return kept
}

function write(map: Map<string, KeptKeyframe>): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...map.entries()]))
  } catch {
    return
  }
}

export function keepKeyframe(run: Run, keyframe: KeptKeyframe): void {
  const map = keptMap()
  map.delete(run.id)
  map.set(run.id, keyframe)
  for (const old of map.keys()) {
    if (map.size <= keptRuns) {
      break
    }
    map.delete(old)
  }
  write(map)
}

export function keptKeyframeOf(run: Run): KeptKeyframe | null {
  return keptMap().get(run.id) ?? null
}

export function runWithKept(run: Run, keyframe: KeptKeyframe | null): Run {
  const isNumbered = keyframeNumberOf(run.inputs[keyframeInput]) !== null
  if (keyframe === null || isNumbered) {
    return run
  }
  return { ...run, inputs: keyframe.inputs }
}

export function keptRunOf(run: Run): Run {
  return runWithKept(run, keptKeyframeOf(run))
}

export function forgetKeptKeyframes(): void {
  kept = null
}
