import type { EngineBinding } from "@rosesfield/contract"
import {
  comfyWorkflow,
  selectBinding,
  taskBinding,
} from "@rosesfield/generation/bindings"
import { z } from "zod"
import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import {
  graphModel,
  meshyImageModel,
  meshyImageWorkflow,
  threeDTasks,
} from "#three-d/three-d-models"
import { workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"
import graph from "./pixal3d-trellis-2.api.json"

export const pixal3dModels: readonly string[] = [
  "pixal3d_int8_convrot.safetensors",
  "trellis_2_shape_vae_bf16.safetensors",
  "dino_v3_L_naf_fp32.safetensors",
  "moge_2_vitl_normal_fp16.safetensors",
  "birefnet.safetensors",
]

export const imageNode = "122"

export const structureSamplerNode = "3"

function parsedGraph(): z.infer<typeof apiGraph> {
  const result = apiGraph.safeParse(graph)
  if (!result.success) {
    throw new AppDefinitionInvalidError({
      folder: "three-d",
      reason: `the Pixal3D graph: ${z.prettifyError(result.error)}`,
    })
  }
  return result.data
}

export const pixal3dBinding: EngineBinding = comfyWorkflow({
  workflow: parsedGraph(),
  bindings: [
    {
      from: "input",
      name: "image",
      index: 0,
      path: [imageNode, "inputs", "image"],
    },
    { from: "seed", path: [structureSamplerNode, "inputs", "seed"] },
  ],
  models: [...pixal3dModels],
  outputsPerJob: "one",
})

export const meshyImageBinding: EngineBinding = workflowBinding({
  workflow: meshyImageWorkflow,
  bindings: [
    { from: "input", name: "image", index: 0, to: "image" },
    { from: "seed", to: "seed" },
  ],
  outputsPerJob: "one",
})

export const photoGraphs: EngineBinding = selectBinding({
  input: "model",
  options: {
    [graphModel]: pixal3dBinding,
    [meshyImageModel]: meshyImageBinding,
  },
})

export function threeDEngine(defaultModel: string): EngineBinding {
  return taskBinding({
    tasks: threeDTasks,
    input: "model",
    default: defaultModel,
    fallback: photoGraphs,
  })
}
