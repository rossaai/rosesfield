import type { EngineBinding } from "@rosesfield/contract"
import {
  backgroundWords,
  clothesWords,
  framingWords,
  glassesWords,
} from "#headshots/comfy/headshot-words"
import { headshotSizes, maxHeadshots } from "#headshots/headshots-values"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export type Link = [node: string, slot: number]

export const headshotsWorkflow = "headshots-qwen-image-edit-2511"

export function branchNode(index: number, step: number): string {
  return String((index + 1) * 1000 + step)
}

function spaced(
  words: Readonly<Record<string, string>>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(words).map(([value, text]) => [
      value,
      text === "" ? "" : ` ${text}`,
    ])
  )
}

function sideMap(side: "width" | "height"): Record<string, number> {
  return Object.fromEntries(
    Object.entries(headshotSizes).map(([ratio, size]) => [ratio, size[side]])
  )
}

function batchEnds(): Record<string, Link> {
  const ends: Record<string, Link> = { "1": [branchNode(0, 2), 0] }
  for (let count = 2; count <= maxHeadshots; count += 1) {
    ends[String(count)] = [String(900 + count), 0]
  }
  return ends
}

const bindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: "image", index: 0, to: "image" },
  { from: "seed", to: "seed" },
  {
    from: "input",
    name: "framing",
    map: { ...framingWords },
    to: "framing",
  },
  {
    from: "input",
    name: "background",
    map: { ...backgroundWords },
    to: "background",
  },
  {
    from: "input",
    name: "clothes",
    map: { ...clothesWords },
    to: "clothes",
  },
  {
    from: "input",
    name: "keepGlasses",
    map: spaced(glassesWords),
    to: "glasses",
  },
  { from: "aspectRatio", map: sideMap("width"), to: "width" },
  { from: "aspectRatio", map: sideMap("height"), to: "height" },
  { from: "count", map: batchEnds(), to: "count" },
]

export const headshotsBinding: EngineBinding = workflowBinding({
  workflow: headshotsWorkflow,
  bindings,
})
