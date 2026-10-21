import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import {
  modelsTakingInput,
  referenceImageInputsOf,
} from "@/catalog/app-facts"

type MediaField = Extract<ModelField, { kind: "media" }>

export function graphReferencesOf(
  app: AppListing,
  model: string
): MediaField | null {
  const input = referenceImageInputsOf(app).find((one) =>
    modelsTakingInput(one).includes(model)
  )
  return input === undefined
    ? null
    : {
        name: input.name,
        path: input.name,
        required: input.presence === "required",
        kind: "media",
        media: "image",
        min: 0,
        max: input.max,
      }
}

export function referenceModelOf(
  app: AppListing,
  models: readonly CatalogModel[]
): string | null {
  const named = referenceImageInputsOf(app).flatMap(modelsTakingInput)
  return (
    models.find((model) => model.kind === "graph" && named.includes(model.id))
      ?.id ?? null
  )
}
