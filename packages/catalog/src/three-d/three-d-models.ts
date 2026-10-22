import { isHeldOnCloud } from "#comfy/cloud-weights"

export const graphModel = "pixal3d-trellis-2"

export const textModel = "meshy/meshy-7.1"

export const threeDTasks: readonly string[] = ["three-d"]

export const pixal3dTemplateFiles: readonly string[] = [
  "pixal3d_int8_convrot.safetensors",
  "trellis_2_int8_convrot.safetensors",
  "trellis_2_shape_vae_bf16.safetensors",
  "trellis_2_texture_vae_bf16.safetensors",
  "dino_v3_L_naf_fp32.safetensors",
  "moge_2_vitl_normal_fp16.safetensors",
  "birefnet.safetensors",
]

export function heldGraphs(held: ReadonlySet<string>): string[] {
  return isHeldOnCloud(pixal3dTemplateFiles, held) ? [graphModel] : []
}

export function defaultModelOf(graphs: readonly string[]): string {
  return graphs[0] ?? textModel
}
