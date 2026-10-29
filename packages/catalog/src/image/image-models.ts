import type { EngineBinding } from "@rosesfield/contract"
import { qwenWorkflow } from "#ads/comfy/qwen-edit-workflow"
import { type ModelFactsFile, modelFactsData } from "#comfy/model-facts"
import {
  qwenSizes,
  type SizeTable,
  sizesAt1k,
  sizesAt2k,
} from "#image/comfy/image-sizes"
import {
  mingImage01Design,
  qwenImage2512,
  qwenImageEdit2511,
  zImageTurbo,
} from "#image/comfy/open-weights"
import { findWorkflow } from "#list-workflows"

export const resolutionValues = ["1k", "2k"] as const

export type ResolutionValue = (typeof resolutionValues)[number]

export type ImageModel = {
  value: string
  labelKey: string
  workflow: string
  sizes: Partial<Record<ResolutionValue, SizeTable>>
  bind: (table: SizeTable) => EngineBinding
}

export const imageGraphs: readonly ImageModel[] = [
  {
    value: "ming-image-0-1-design",
    labelKey: "image.model.mingImage01Design",
    workflow: "image-ming-image-0-1-design",
    sizes: { "1k": sizesAt1k, "2k": sizesAt2k },
    bind: mingImage01Design,
  },
  {
    value: "z-image-turbo",
    labelKey: "image.model.zImageTurbo",
    workflow: "image-z-image-turbo",
    sizes: { "1k": sizesAt1k, "2k": sizesAt2k },
    bind: zImageTurbo,
  },
  {
    value: "qwen-image-2512",
    labelKey: "image.model.qwenImage2512",
    workflow: "image-qwen-image-2512",
    sizes: { "1k": qwenSizes },
    bind: qwenImage2512,
  },
  {
    value: "qwen-image-edit-2511",
    labelKey: "image.model.qwenImageEdit2511",
    workflow: qwenWorkflow,
    sizes: { "1k": sizesAt1k },
    bind: qwenImageEdit2511,
  },
]

const imageTask = "text-to-image"

export function cloudImageModels(models: readonly ImageModel[]): ImageModel[] {
  return models.filter(
    (model) => findWorkflow(model.workflow)?.runsOn === "cloud-and-local"
  )
}

function openRankOf(model: ImageModel, data: ModelFactsFile): number | null {
  const id = `graph/${model.value}`
  const row = Object.hasOwn(data.models, id) ? data.models[id] : undefined
  if (row === undefined || row.weights === null) {
    return null
  }
  return row.ranks[imageTask] ?? null
}

export const firstModel = "bfl/flux-3-image"

export function openDefaultOf(
  models: readonly ImageModel[],
  data: ModelFactsFile = modelFactsData
): string {
  const ranked = models
    .flatMap((model) => {
      const position = openRankOf(model, data)
      return position === null ? [] : [{ value: model.value, position }]
    })
    .sort((a, b) => a.position - b.position)
  return ranked[0]?.value ?? models[0]?.value ?? firstModel
}

export const imageModels: readonly ImageModel[] = cloudImageModels(imageGraphs)

export const referenceModel = "qwen-image-edit-2511"

export const defaultModel = openDefaultOf(imageModels)

export const defaultResolution: ResolutionValue = "1k"

export function resolutionsOf(model: ImageModel): ResolutionValue[] {
  return resolutionValues.filter((value) => model.sizes[value] !== undefined)
}

export function resolutionKeyOf(value: ResolutionValue): string {
  return `image.choice.resolution.r${value}`
}
