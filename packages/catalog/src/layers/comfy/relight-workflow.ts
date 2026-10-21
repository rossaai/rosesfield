import type { EngineBinding } from "@rosesfield/contract"
import { z } from "zod"
import {
  type ApiWorkflow,
  addNode,
  inputsOf,
  keepEveryAlphaStep,
  layOnGrey,
} from "#layers/comfy/layer-nodes"
import { lightPhrases, tonePhrases } from "#layers/comfy/light-words"
import {
  defaultRelightModel,
  modelsLoaded,
  type RelightQuality,
  relightWorkflows,
  workflowFor,
} from "#relight/comfy/relight-binding"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const relightGraph = defaultRelightModel

export const relightWorkflow = relightWorkflows[relightGraph]

export const relightNodes = {
  layer: "1",
  scaled: "2",
  decoded: "15",
  saved: "16",
} as const

const modelNames = z.array(z.string())

const bindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: "layer", index: 0, to: "image" },
  { from: "count", map: { "1": 1 }, to: "count" },
  { from: "seed", to: "seed" },
  { from: "input", name: "light", map: lightPhrases, to: "direction" },
  { from: "input", name: "tone", map: tonePhrases, to: "color" },
]

export function withOutline(graph: ApiWorkflow): ApiWorkflow {
  const size = addNode(graph, {
    class_type: "GetImageSize",
    inputs: { image: [relightNodes.layer, 0] },
  })
  const onGrey = layOnGrey(graph, relightNodes.layer, size)
  inputsOf(graph, relightNodes.scaled).image = [onGrey, 0]
  const back = addNode(graph, {
    class_type: "ImageScale",
    inputs: {
      image: [relightNodes.decoded, 0],
      upscale_method: "lanczos",
      width: [size, 0],
      height: [size, 1],
      crop: "disabled",
    },
  })
  const join = addNode(graph, {
    class_type: "JoinImageWithAlpha",
    inputs: { image: [back, 0], alpha: [relightNodes.layer, 1] },
  })
  keepEveryAlphaStep(graph, join, size)
  inputsOf(graph, relightNodes.saved).images = [join, 0]
  return graph
}

export function relightBinding(quality: RelightQuality): EngineBinding {
  let sent: ApiWorkflow = {}
  const binding = workflowBinding({
    workflow: relightWorkflow,
    bindings,
    patch: (graph) => {
      sent = withOutline(workflowFor(relightGraph, quality, graph))
      return sent
    },
  })
  const models = modelNames.parse(binding.config.models ?? [])
  return {
    ...binding,
    config: { ...binding.config, models: modelsLoaded(models, sent) },
  }
}
