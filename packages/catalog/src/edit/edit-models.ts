export const graphModel = "qwen-image-edit-2511"

export const hostedModel = "bfl/flux-3-image"

export const editModels = [graphModel, hostedModel] as const

export type EditModel = (typeof editModels)[number]

export const modelLabels: Readonly<Record<EditModel, string>> = {
  "qwen-image-edit-2511": "edit.model.qwenImageEdit2511",
  "bfl/flux-3-image": "edit.model.flux3Image",
}

export const resolutions = ["small", "full"] as const

export type Resolution = (typeof resolutions)[number]

export const megapixelsOf: Readonly<Record<Resolution, number>> = {
  small: 0.5,
  full: 1,
}

export const defaultResolution: Resolution = "full"

export const editAspectRatios = [
  "21:9",
  "2:1",
  "16:9",
  "5:3",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "3:5",
  "9:16",
  "1:2",
  "9:21",
] as const

export const photoAccept = {
  formats: ["image/png", "image/jpeg", "image/webp"],
  maxBytes: 20_000_000,
  minShortSide: 480,
} as const
