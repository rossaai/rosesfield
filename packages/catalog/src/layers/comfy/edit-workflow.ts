import type { EngineBinding } from "@rosesfield/contract"
import {
  graphOf,
  inputsOf,
  keepEveryAlphaStep,
  oneLayerBindings,
} from "#layers/comfy/layer-nodes"
import { workflowBinding } from "#workflow-binding"

export const editWorkflow = "layers-edit-qwen-image-edit-2511"

export const editQuality = {
  draft: { lora: 1, steps: 4, cfg: 1 },
  final: { lora: 0, steps: 40, cfg: 4 },
} as const

export type Quality = keyof typeof editQuality

export const editNodes = { size: "2", join: "21" } as const

export function editBinding(quality: Quality): EngineBinding {
  return workflowBinding({
    workflow: editWorkflow,
    bindings: [
      ...oneLayerBindings,
      { from: "seed", to: "seed" },
      { from: "input", name: "change", to: "change" },
    ],
    patch: (workflow) => {
      const graph = graphOf(workflow)
      const values = editQuality[quality]
      inputsOf(graph, "6").strength_model = values.lora
      const sampler = inputsOf(graph, "18")
      sampler.steps = values.steps
      sampler.cfg = values.cfg
      keepEveryAlphaStep(graph, editNodes.join, editNodes.size)
      return graph
    },
  })
}
