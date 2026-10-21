import {
  type CatalogModel,
  lengthOf,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { defaultsOf, type FieldValue } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import { hostedDefaults } from "@/screens/app/hosted/hosted-form"

export type MotionTab = "move" | "swap"

export const motionTabs: readonly MotionTab[] = ["move", "swap"]

export const tabKeys: Readonly<Record<MotionTab, string>> = {
  move: "motion.tab.move",
  swap: "motion.tab.swap",
}

export const tabTasks: Readonly<Record<MotionTab, string>> = {
  move: "motion-transfer",
  swap: "character-swap",
}

export const swapHash = "swap"

export const modeInput = "mode"
export const modelInput = "model"
export const seedInput = "seed"

export type ClipRange = { min: number; max: number }

export const graphClipRange: ClipRange = { min: 2, max: 10 }

export type WellNames = { clip: string; photo: string }

type Inputs = Readonly<Record<string, FieldValue>>

type MediaField = Extract<ModelField, { kind: "media" }>

export function isMotionTab(value: unknown): value is MotionTab {
  return motionTabs.some((tab) => tab === value)
}

export function tabOfHash(hash: string): MotionTab {
  return hash.replace(/^#/, "") === swapHash ? "swap" : "move"
}

function isGraph(model: CatalogModel): boolean {
  return model.form === null
}

export function tabsOfModel(model: CatalogModel): MotionTab[] {
  if (isGraph(model)) {
    return [...motionTabs]
  }
  return motionTabs.filter((tab) => tabTasks[tab] === model.task)
}

export function modelsOfTab(
  models: readonly CatalogModel[],
  tab: MotionTab
): CatalogModel[] {
  return models.filter((model) => tabsOfModel(model).includes(tab))
}

export function modelForTab(
  models: readonly CatalogModel[],
  ids: readonly (string | null)[]
): CatalogModel | null {
  for (const id of ids) {
    const model = models.find((one) => one.id === id)
    if (model !== undefined) {
      return model
    }
  }
  return models[0] ?? null
}

function appInputOf(
  app: AppListing,
  type: "image" | "video"
): InputDefinition | undefined {
  return app.inputs.find((input) => input.type === type)
}

function mediaOf(
  model: CatalogModel,
  media: "image" | "video"
): MediaField | undefined {
  return (model.form ?? []).find(
    (field): field is MediaField =>
      field.kind === "media" && field.media === media
  )
}

export function wellNamesOf(
  app: AppListing,
  model: CatalogModel | null
): WellNames {
  const clip = appInputOf(app, "video")?.name ?? "clip"
  const photo = appInputOf(app, "image")?.name ?? "photo"
  if (model === null || isGraph(model)) {
    return { clip, photo }
  }
  return {
    clip: mediaOf(model, "video")?.name ?? clip,
    photo: mediaOf(model, "image")?.name ?? photo,
  }
}

function graphRangeOf(app: AppListing): ClipRange {
  const length = app.inputs.find(
    (input): input is Extract<InputDefinition, { type: "number" }> =>
      input.type === "number" && input.name === "length"
  )
  return length === undefined
    ? graphClipRange
    : { min: length.min, max: length.max }
}

export function clipRangeOf(
  app: AppListing,
  model: CatalogModel | null
): ClipRange | null {
  if (model === null || isGraph(model)) {
    return graphRangeOf(app)
  }
  return lengthOf(model.form ?? [])
}

export function restFieldsOf(model: CatalogModel | null): ModelField[] {
  if (model === null || model.form === null) {
    return []
  }
  const wells = [mediaOf(model, "video")?.name, mediaOf(model, "image")?.name]
  return model.form.filter(
    (field) => !(field.kind === "media" && wells.includes(field.name))
  )
}

export function graphRestOf(app: AppListing): InputDefinition[] {
  const wells = [appInputOf(app, "video"), appInputOf(app, "image")]
  return app.inputs.filter(
    (input) =>
      !wells.includes(input) &&
      input.type !== "seed" &&
      input.type !== "character" &&
      input.name !== modelInput &&
      input.name !== modeInput
  )
}

export type HeldWells = { clip: string[]; photo: string[] }

export function heldWellsOf(inputs: Inputs, names: WellNames): HeldWells {
  return {
    clip: listOf(inputs[names.clip]),
    photo: listOf(inputs[names.photo]),
  }
}

export function inputsForModel(
  app: AppListing,
  model: CatalogModel,
  kept: Inputs,
  tab: MotionTab,
  wells: HeldWells
): Record<string, FieldValue> {
  const names = wellNamesOf(app, model)
  if (isGraph(model)) {
    const base = defaultsOf(app).inputs
    const shared = Object.fromEntries(
      app.inputs.map((input) => [
        input.name,
        kept[input.name] ?? base[input.name],
      ])
    )
    return {
      ...base,
      ...shared,
      [modeInput]: tab,
      [names.clip]: [...wells.clip],
      [names.photo]: [...wells.photo],
      [modelInput]: model.id,
    }
  }
  return {
    ...hostedDefaults(model.form ?? [], kept),
    [modeInput]: tab,
    [names.clip]: [...wells.clip],
    [names.photo]: [...wells.photo],
    [modelInput]: model.id,
  }
}

export function tabOfModel(
  model: CatalogModel | null,
  tab: MotionTab
): MotionTab {
  if (model === null) {
    return tab
  }
  const tabs = tabsOfModel(model)
  return tabs.includes(tab) ? tab : (tabs[0] ?? tab)
}
