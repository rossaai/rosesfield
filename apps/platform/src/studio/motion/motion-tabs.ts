import {
  type CatalogModel,
  lengthOf,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import { exampleInput, graphClipRangeOf } from "@rosesfield/catalog/motion"
import {
  type AppListing,
  type InputDefinition,
  isChainFilled,
} from "@rosesfield/contract"
import { defaultsOf, type FieldValue } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import { hostedDefaults } from "@/screens/app/hosted/hosted-form"

/** Motion's two modes: Move, where your video drives your character, and Swap, where one thing in your video becomes yours. */
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

/** The seconds a model takes of your video. A Motion graph trims a longer video to its first stretch, and a hosted model refuses it. */
export type ClipRange = { min: number; max: number; trims: boolean }

export type WellNames = { clip: string; photo: string }

type Inputs = Readonly<Record<string, FieldValue>>

type MediaField = Extract<ModelField, { kind: "media" }>

export function isMotionTab(value: unknown): value is MotionTab {
  return motionTabs.some((tab) => tab === value)
}

export function tabOfHash(hash: string): MotionTab {
  return hash.replace(/^#/, "") === swapHash ? "swap" : "move"
}

export function isGraph(model: CatalogModel): boolean {
  return model.kind === "graph"
}

/** The tab of a model's task: Swap for a model that swaps one thing in your video, Move for every other. */
export function tabOfTask(model: CatalogModel): MotionTab {
  return model.task === tabTasks.swap ? "swap" : "move"
}

export function modelsOfTab(
  models: readonly CatalogModel[],
  tab: MotionTab
): CatalogModel[] {
  return models.filter((model) => tabOfTask(model) === tab)
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

/** Your own photo or video input of the app: the first of its kind that no run chain fills. */
function appInputOf(
  app: AppListing,
  type: "image" | "video"
): InputDefinition | undefined {
  return app.inputs.find(
    (input) => input.type === type && !isChainFilled(input)
  )
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

/** The seconds the chosen model takes: the stretch a Motion graph keeps, which trims a longer video, or the length a hosted model's schema declares, which refuses one. Before the model list arrives, the model the form names. */
export function clipRangeOf(
  model: CatalogModel | null,
  named = ""
): ClipRange | null {
  if (model === null || isGraph(model)) {
    const range = graphClipRangeOf(model?.id ?? named)
    return range === null ? null : { ...range, trims: true }
  }
  const length = lengthOf(model.form ?? [])
  return length === null ? null : { ...length, trims: false }
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
      !isChainFilled(input) &&
      input.type !== "seed" &&
      input.type !== "character" &&
      input.name !== modelInput &&
      input.name !== modeInput &&
      input.name !== exampleInput
  )
}

export type HeldWells = { clip: string[]; photo: string[] }

export function heldWellsOf(inputs: Inputs, names: WellNames): HeldWells {
  return {
    clip: listOf(inputs[names.clip]),
    photo: listOf(inputs[names.photo]),
  }
}

/** The form for a model on a tab, with your clip and photos carried into its wells. */
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
