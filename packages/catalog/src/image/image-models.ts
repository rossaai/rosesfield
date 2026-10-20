import type { EngineBinding } from "@rosesfield/contract"
import {
  qwenSizes,
  type SizeTable,
  sizesAt1k,
  sizesAt2k,
} from "#image/comfy/image-sizes"
import { qwenImage2512, zImageTurbo } from "#image/comfy/open-weights"

export const resolutionValues = ["1k", "2k"] as const

export type ResolutionValue = (typeof resolutionValues)[number]

export type ImageModel = {
  value: string
  labelKey: string
  sizes: Partial<Record<ResolutionValue, SizeTable>>
  bind: (table: SizeTable) => EngineBinding
}

export const imageModels: readonly ImageModel[] = [
  {
    value: "z-image-turbo",
    labelKey: "image.model.zImageTurbo",
    sizes: { "1k": sizesAt1k, "2k": sizesAt2k },
    bind: zImageTurbo,
  },
  {
    value: "qwen-image-2512",
    labelKey: "image.model.qwenImage2512",
    sizes: { "1k": qwenSizes },
    bind: qwenImage2512,
  },
]

export const firstModel = "bfl/flux-3-image"

export const defaultModel = "z-image-turbo"

export const defaultResolution: ResolutionValue = "1k"

export function resolutionsOf(model: ImageModel): ResolutionValue[] {
  return resolutionValues.filter((value) => model.sizes[value] !== undefined)
}

export function resolutionKeyOf(value: ResolutionValue): string {
  return `image.choice.resolution.r${value}`
}
