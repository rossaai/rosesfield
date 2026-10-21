import {
  firstKeyframeInput,
  keyframeInput,
  keyframeNumberOf,
  keyframeTextModel,
} from "@rosesfield/catalog/storyboard"
import type { Run } from "@rosesfield/contract"
import {
  maxScenes,
  sceneCountInput,
} from "../../../../../packages/catalog/src/storyboard/storyboard-inputs"

export type KeyframeBlock =
  | { kind: "run"; run: Run }
  | {
      kind: "chain"
      lead: Run
      count: number
      runs: ReadonlyMap<number, Run>
    }

type Group = {
  signature: string | null
  first: Run
  runs: Map<number, Run>
}

const callInputs: readonly string[] = [
  keyframeInput,
  firstKeyframeInput,
  "model",
]

function signatureOf(run: Run): string {
  const shared = Object.entries(run.inputs)
    .filter(([name]) => !callInputs.includes(name))
    .sort(([one], [other]) => one.localeCompare(other))
  return JSON.stringify([shared, run.seed, run.aspectRatio])
}

function countOf(run: Run): number {
  const count = Number(run.inputs[sceneCountInput])
  return Number.isInteger(count) ? Math.min(Math.max(count, 1), maxScenes) : 1
}

function leadOf(group: Group): Run {
  const ordered = [...group.runs.entries()]
    .sort(([one], [other]) => one - other)
    .map(([, run]) => run)
  return (
    ordered.find((run) => run.inputs.model !== keyframeTextModel?.value) ??
    ordered[0] ??
    group.first
  )
}

function blockOf(group: Group): KeyframeBlock {
  if (group.signature === null) {
    return { kind: "run", run: group.first }
  }
  const lead = leadOf(group)
  return { kind: "chain", lead, count: countOf(lead), runs: group.runs }
}

export function keyframeBlocksOf(runs: readonly Run[]): KeyframeBlock[] {
  const groups: Group[] = []
  for (const run of runs) {
    const number = keyframeNumberOf(run.inputs[keyframeInput])
    const last = groups[groups.length - 1]
    if (number === null) {
      groups.push({ signature: null, first: run, runs: new Map() })
      continue
    }
    const signature = signatureOf(run)
    if (
      last !== undefined &&
      last.signature === signature &&
      !last.runs.has(number)
    ) {
      last.runs.set(number, run)
    } else {
      groups.push({ signature, first: run, runs: new Map([[number, run]]) })
    }
  }
  return groups.map(blockOf)
}
