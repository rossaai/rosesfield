export type Link = [node: string, slot: number]

export const keepSentence =
  "Keep the same subject and the same look as in the image, and change only what the following scene describes."

export const qwenFiles = {
  edit: "qwen_image_edit_2511_fp8mixed.safetensors",
  text: "qwen_image_2512_fp8_e4m3fn.safetensors",
  encoder: "qwen_2.5_vl_7b_fp8_scaled.safetensors",
  vae: "qwen_image_vae.safetensors",
} as const

export const kleinFiles = {
  unet: "flux-2-klein-4b-fp8.safetensors",
  encoder: "qwen_3_4b.safetensors",
  vae: "flux2-vae.safetensors",
} as const
