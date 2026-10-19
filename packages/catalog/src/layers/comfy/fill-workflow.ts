import type { EngineBinding } from "@rosesfield/contract"
import { graphOf, inputsOf, oneLayerBindings } from "#layers/comfy/layer-nodes"
import { workflowBinding } from "#workflow-binding"

export const fillQuality = {
  draft: { steps: 20, cfg: 2.5 },
  final: { steps: 50, cfg: 4 },
} as const

type Quality = keyof typeof fillQuality

export const fillWorkflow = "layers-fill-qwen-image"

export function fillBinding(quality: Quality): EngineBinding {
  return workflowBinding({
    workflow: fillWorkflow,
    bindings: [
      ...oneLayerBindings,
      { from: "input", name: "mask", index: 0, to: "mask" },
      { from: "input", name: "content", to: "content" },
      { from: "seed", to: "seed" },
    ],
    patch: (workflow) => {
      const graph = graphOf(workflow)
      const sampler = inputsOf(graph, "45")
      sampler.steps = fillQuality[quality].steps
      sampler.cfg = fillQuality[quality].cfg
      return graph
    },
  })
}
