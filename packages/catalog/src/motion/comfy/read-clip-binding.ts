import type { EngineBinding } from "@rosesfield/contract"
import type { StepRun } from "@rosesfield/generation/bindings"
import type { AssetId } from "@rosesfield/kernel"
import { type ClipPlan, trackTextOf } from "#motion/clip-plan"
import { motionAppId, readClipModel } from "#motion/motion-models"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const readClipWorkflow = "motion-read-clip"

export const readClipOutputNodes = {
  depth: "13",
  mask: "28",
  firstFrame: "31",
} as const

export type ReadClipOutput = keyof typeof readClipOutputNodes

export const readClipInputs = {
  model: "model",
  clip: "clip",
  targets: "targets",
  objects: "objects",
} as const

const bindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: readClipInputs.clip, index: 0, to: "clip" },
  { from: "input", name: readClipInputs.targets, to: "targets" },
  {
    from: "input",
    name: readClipInputs.objects,
    to: "objects",
    map: { "1": 1, "2": 2, "3": 3 },
  },
]

/** The read names no result node: its depth, its mask and its first frame are all held out of the library. */
export const readClipBinding: EngineBinding = workflowBinding({
  workflow: readClipWorkflow,
  bindings,
  results: [],
})

export function readClipRequestOf(input: {
  clip: AssetId
  plan: ClipPlan
}): StepRun {
  return {
    appId: motionAppId,
    request: {
      inputs: {
        [readClipInputs.model]: readClipModel,
        [readClipInputs.clip]: [input.clip],
        [readClipInputs.targets]: trackTextOf(input.plan),
        [readClipInputs.objects]: String(input.plan.targets.length),
      },
      aspectRatio: null,
      place: "held",
    },
  }
}
