import type { EngineBinding } from "@rosesfield/contract"
import { graphOf, inputsOf } from "#layers/comfy/layer-nodes"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const splitWorkflow = "layers-split-qwen-image-layered"

export const splitBuckets = { draft: 640, final: 1024 } as const

export const layerCounts = [2, 3, 4, 5, 6, 7, 8] as const

const splitBindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: "source", index: 0, to: "source" },
  { from: "seed", to: "seed" },
  {
    from: "count",
    map: Object.fromEntries(layerCounts.map((count) => [String(count), count])),
    to: "count",
  },
]

export function splitBinding(
  quality: keyof typeof splitBuckets
): EngineBinding {
  return workflowBinding({
    workflow: splitWorkflow,
    bindings: splitBindings,
    patch: (workflow) => {
      const graph = graphOf(workflow)
      inputsOf(graph, "2").largest_size = splitBuckets[quality]
      return graph
    },
  })
}
