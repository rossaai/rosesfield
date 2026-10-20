import {
  type CatalogModel,
  lengthOf,
  type ModelField,
  type ModelTag,
  topResolutionOf,
} from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { modelsOfTab, type VideoTab } from "@/studio/video/video-tabs"

type AppInput = AppListing["inputs"][number]

function fieldOfInput(input: AppInput): ModelField | null {
  const base = { name: input.name, path: input.name, required: false }
  switch (input.type) {
    case "choice":
      return {
        ...base,
        kind: "choice",
        options: input.options.map((option) => option.value),
        default: input.default,
      }
    case "number":
      return {
        ...base,
        kind: "number",
        min: input.min,
        max: input.max,
        integer: Number.isInteger(input.step),
        default: input.default,
      }
    default:
      return null
  }
}

export function graphTagsOf(app: AppListing): ModelTag[] {
  const fields = app.inputs.flatMap((input) => {
    const field = fieldOfInput(input)
    return field === null ? [] : [field]
  })
  const tags: ModelTag[] = []
  const resolution = topResolutionOf(fields)
  const length = lengthOf(fields)
  if (resolution !== null) {
    tags.push({ kind: "resolution", value: resolution })
  }
  if (length !== null) {
    tags.push({ kind: "length", ...length })
  }
  return tags
}

export function pickerModelsOf(
  models: readonly CatalogModel[],
  tab: VideoTab,
  app: AppListing
): CatalogModel[] {
  const graphTags = graphTagsOf(app)
  return modelsOfTab(models, tab).map((model) =>
    model.kind === "graph"
      ? {
          ...model,
          tags: [
            ...model.tags,
            ...graphTags.filter(
              (tag) => !model.tags.some((own) => own.kind === tag.kind)
            ),
          ],
        }
      : model
  )
}
