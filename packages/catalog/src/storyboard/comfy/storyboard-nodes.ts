export type Link = [node: string, slot: number]

export const keepSentence =
  "Keep the same subject and the same look as in the image, and change only what the following scene describes."

export const qwenFiles = {
  edit: "qwen_image_edit_2511_fp8mixed.safetensors",
  encoder: "qwen_2.5_vl_7b_fp8_scaled.safetensors",
  vae: "qwen_image_vae.safetensors",
} as const

export const editNodes = {
  seed: "6",
  anchor: "7",
  anchorScale: "8",
  latent: "11",
  firstKeep: "100",
  firstPrompt: "101",
  firstEdit: ["103", "104", "105", "106"],
  firstKeyframe: "106",
  firstBatch: "902",
  encoderClass: "TextEncodeQwenImageEditPlus",
} as const

export const photoSlots = [
  { node: "12", input: "image2", to: "anchor2" },
  { node: "13", input: "image3", to: "anchor3" },
] as const
