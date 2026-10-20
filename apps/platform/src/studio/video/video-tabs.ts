import type { CatalogModel } from "@rosesfield/catalog/comfy"
import type { FieldValue } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import { type VideoFields, videoFieldsOf } from "@/studio/video/video-fields"

export type VideoTab = "text-image" | "references" | "first-last"

export const videoTabs: readonly VideoTab[] = [
  "text-image",
  "references",
  "first-last",
]

export const tabKeys: Readonly<Record<VideoTab, string>> = {
  "text-image": "video.tab.textImage",
  references: "video.tab.references",
  "first-last": "video.tab.firstLast",
}

export const startFrameInput = "startFrame"

export const lastFrameInput = "lastFrame"

const graphTabs: readonly VideoTab[] = ["text-image", "first-last"]

type Inputs = Readonly<Record<string, FieldValue>>

export function fieldsOfModel(model: CatalogModel | null): VideoFields | null {
  return model?.form === null || model?.form === undefined
    ? null
    : videoFieldsOf(model.form)
}

export function tabsOfModel(model: CatalogModel): VideoTab[] {
  const fields = fieldsOfModel(model)
  if (fields === null) {
    return model.kind === "graph" ? [...graphTabs] : ["text-image"]
  }
  const has: Readonly<Record<VideoTab, boolean>> = {
    "text-image": true,
    references: fields.references !== null,
    "first-last": fields.start !== null && fields.last !== null,
  }
  return videoTabs.filter((tab) => has[tab])
}

export function modelsOfTab(
  models: readonly CatalogModel[],
  tab: VideoTab
): CatalogModel[] {
  return models.filter((model) => tabsOfModel(model).includes(tab))
}

export function modelForTab(
  models: readonly CatalogModel[],
  chosen: string | null,
  fallback: string | null
): string | null {
  if (models.some((model) => model.id === chosen)) {
    return chosen
  }
  if (models.some((model) => model.id === fallback)) {
    return fallback
  }
  return models[0]?.id ?? null
}

export type ImageSlots = {
  start: { name: string; max: number } | null
  references: { name: string; max: number } | null
  last: { name: string; max: number } | null
}

export function slotsOf(fields: VideoFields | null, tab: VideoTab): ImageSlots {
  if (fields === null) {
    return {
      start: tab === "references" ? null : { name: startFrameInput, max: 1 },
      references: null,
      last: tab === "first-last" ? { name: lastFrameInput, max: 1 } : null,
    }
  }
  const slot = (
    field: VideoFields["start"],
    max: number
  ): { name: string; max: number } | null =>
    field === null ? null : { name: field.name, max: Math.min(max, field.max) }
  switch (tab) {
    case "text-image":
      return { start: slot(fields.start, 1), references: null, last: null }
    case "references":
      return {
        start: null,
        references: slot(fields.references, fields.references?.max ?? 0),
        last: null,
      }
    case "first-last":
      return {
        start: slot(fields.start, 1),
        references: null,
        last: slot(fields.last, 1),
      }
  }
}

function slotNames(slots: ImageSlots): Map<string, number> {
  const held = new Map<string, number>()
  for (const slot of [slots.start, slots.references, slots.last]) {
    if (slot !== null) {
      held.set(slot.name, Math.max(held.get(slot.name) ?? 0, slot.max))
    }
  }
  return held
}

export function imagesForTab(
  fields: VideoFields | null,
  tab: VideoTab,
  inputs: Inputs
): Record<string, string[]> {
  const kept = slotNames(slotsOf(fields, tab))
  const every = new Set<string>()
  for (const one of videoTabs) {
    for (const name of slotNames(slotsOf(fields, one)).keys()) {
      every.add(name)
    }
  }
  const next: Record<string, string[]> = {}
  for (const name of every) {
    const held = listOf(inputs[name])
    const max = kept.get(name) ?? 0
    if (held.length > max) {
      next[name] = held.slice(0, max)
    }
  }
  return next
}

export function tabOfInputs(
  inputs: Inputs,
  model: CatalogModel | null
): VideoTab {
  const fields = fieldsOfModel(model)
  if (fields === null) {
    return "text-image"
  }
  const count = (name: string | undefined): number =>
    name === undefined ? 0 : listOf(inputs[name]).length
  if (fields.last !== null && count(fields.last.name) > 0) {
    return "first-last"
  }
  const references = fields.references
  if (
    references !== null &&
    (references.name !== fields.start?.name || count(references.name) > 1)
  ) {
    return count(references.name) > 0 ? "references" : "text-image"
  }
  return "text-image"
}
