import type { EngineBinding } from "@rosesfield/contract"
import { graphOf, inputsOf, oneLayerBindings } from "#layers/comfy/layer-nodes"
import { lightSentences, toneSentences } from "#layers/comfy/light-words"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const editWorkflow = "layers-edit-qwen-image-edit-2511"

export const editQuality = {
  draft: { lora: 1, steps: 4, cfg: 1 },
  final: { lora: 0, steps: 40, cfg: 4 },
} as const

export type Quality = keyof typeof editQuality

export const promptNode = "13"
const sentenceNode = "23"

function patched(
  workflow: Record<string, unknown>,
  quality: Quality,
  form: "edit" | "relight"
): Record<string, unknown> {
  const graph = graphOf(workflow)
  const values = editQuality[quality]
  inputsOf(graph, "6").strength_model = values.lora
  const sampler = inputsOf(graph, "18")
  sampler.steps = values.steps
  sampler.cfg = values.cfg
  if (form === "edit") {
    inputsOf(graph, sentenceNode)
    delete graph[sentenceNode]
    inputsOf(graph, promptNode).prompt = ""
  }
  return graph
}

const seedBinding: WorkflowValueBinding = { from: "seed", to: "seed" }

export function editBinding(quality: Quality): EngineBinding {
  return workflowBinding({
    workflow: editWorkflow,
    bindings: [
      ...oneLayerBindings,
      seedBinding,
      { from: "input", name: "change", to: "change" },
    ],
    patch: (workflow) => patched(workflow, quality, "edit"),
  })
}

export function relightBinding(quality: Quality): EngineBinding {
  return workflowBinding({
    workflow: editWorkflow,
    bindings: [
      ...oneLayerBindings,
      seedBinding,
      { from: "input", name: "light", map: lightSentences, to: "light" },
      { from: "input", name: "tone", map: toneSentences, to: "tone" },
    ],
    patch: (workflow) => patched(workflow, quality, "relight"),
  })
}
