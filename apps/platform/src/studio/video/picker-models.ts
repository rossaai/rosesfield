import {
  type CatalogModel,
  lengthOf,
  type ModelTag,
  topResolutionOf,
} from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { graphFormOf } from "@/studio/video/graph-form"
import { modelsOfTab, type VideoTab } from "@/studio/video/video-tabs"

export function graphTagsOf(app: AppListing): ModelTag[] {
  const fields = graphFormOf(app).filter((field) => field.kind !== "media")
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
  return modelsOfTab(models, tab, app).map((model) =>
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
