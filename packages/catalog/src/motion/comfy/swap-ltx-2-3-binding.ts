import type { EngineBinding } from "@rosesfield/contract"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const swapWorkflow = "motion-swap-ltx-2-3"

/** The inputs of the swap: your clip, the first of your photos as the reference, who to replace and your scene as the prompt. */
export const swapInputs = {
  clip: "clip",
  photo: "photo",
  target: "target",
  scene: "scene",
} as const

export const swapResultNode = "121"

const bindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: swapInputs.clip, index: 0, to: "clip" },
  { from: "input", name: swapInputs.photo, index: 0, to: "reference" },
  { from: "input", name: swapInputs.target, to: "target" },
  { from: "input", name: swapInputs.scene, to: "prompt" },
  { from: "seed", to: "seed" },
]

export const swapEngine: EngineBinding = workflowBinding({
  workflow: swapWorkflow,
  bindings,
  results: [swapResultNode],
})
