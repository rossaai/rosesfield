export const adsAppId = "ads"

export const kindValues = ["product-shot", "ad"] as const

export type KindValue = (typeof kindValues)[number]

export const styleValues = [
  "studio",
  "lifestyle",
  "outdoor",
  "flat-lay",
  "minimal",
  "bold",
] as const

export type StyleValue = (typeof styleValues)[number]

export const modelValues = ["qwen-image-edit-2511"] as const

export type ModelValue = (typeof modelValues)[number]

export const defaultKind: KindValue = "product-shot"
export const defaultStyle: StyleValue = "studio"
export const defaultModel: ModelValue = "qwen-image-edit-2511"

export const photoInputs = ["product", "secondPhoto", "thirdPhoto"] as const

export type PhotoInput = (typeof photoInputs)[number]

export const referenceLimits: Readonly<Record<ModelValue, number>> = {
  "qwen-image-edit-2511": 3,
}

export const sceneLimit = 500
export const headlineLimit = 60
export const lineLimit = 120

export function keyOf(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase()
  )
}
