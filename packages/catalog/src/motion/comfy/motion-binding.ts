import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"

export const motionWorkflow = "motion-ltx-2-3-ic-lora"

export const videoNode = "122"

export const shortSides: Readonly<Record<string, number>> = {
  "480p": 480,
  "720p": 704,
}

export const motionBindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: "photo", index: 0, to: "photo" },
  { from: "input", name: "clip", index: 0, to: "clip" },
  { from: "input", name: "scene", to: "scene" },
  { from: "input", name: "resolution", map: shortSides, to: "shortSide" },
  { from: "seed", to: "seed" },
]

export function withoutSound(
  workflow: Record<string, unknown>
): Record<string, unknown> {
  const graph = apiGraph.parse(workflow)
  const video = graph[videoNode]
  if (video !== undefined) {
    delete video.inputs.audio
  }
  return graph
}

export const motionEngine: EngineBinding = selectBinding({
  input: "sound",
  options: {
    off: workflowBinding({
      workflow: motionWorkflow,
      bindings: motionBindings,
      patch: withoutSound,
    }),
    on: workflowBinding({ workflow: motionWorkflow, bindings: motionBindings }),
  },
})
