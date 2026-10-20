import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"

type MediaField = Extract<ModelField, { kind: "media" }>
type ImageInput = Extract<AppListing["inputs"][number], { type: "image" }>

const modelInput = "model"

function modelsOfInput(input: ImageInput): readonly string[] {
  return (input.when ?? []).flatMap((condition) =>
    "is" in condition && condition.input === modelInput ? condition.is : []
  )
}

function modelImageInputs(app: AppListing): ImageInput[] {
  return app.inputs.filter(
    (input): input is ImageInput =>
      input.type === "image" && modelsOfInput(input).length > 0
  )
}

export function graphReferencesOf(
  app: AppListing,
  model: string
): MediaField | null {
  const input = modelImageInputs(app).find((one) =>
    modelsOfInput(one).includes(model)
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
  const named = modelImageInputs(app).flatMap(modelsOfInput)
  return (
    models.find((model) => model.kind === "graph" && named.includes(model.id))
      ?.id ?? null
  )
}
