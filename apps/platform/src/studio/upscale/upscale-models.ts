import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { defaultsOf, type FieldValue } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import { hostedDefaults } from "@/screens/app/hosted/hosted-form"
import {
  maxLongSide,
  type UpscaleMode,
} from "@/studio/upscale/upscale-limits"

export const modeInput = "mode"
export const scaleInput = "scale"
export const modelInput = "model"
export const seedInput = "seed"

export const upscaleModes: readonly UpscaleMode[] = ["image", "video"]

type Inputs = Readonly<Record<string, FieldValue>>

type MediaField = Extract<ModelField, { kind: "media" }>

export type ScaleOption = {
  value: string | number
  factor: number | null
}

export type ScaleSpec = {
  name: string
  options: readonly ScaleOption[]
  initial: string | number | null
  maxLongSide: number | null
}

const scalePattern = /scale|factor|increase|resolution/i

const factorPattern = /^x?(\d+(?:\.\d+)?)x?$/i

const factorCandidates: readonly number[] = [2, 4]

function isGraph(model: CatalogModel): boolean {
  return model.form === null
}

function mediaOf(
  model: CatalogModel,
  mode: UpscaleMode
): MediaField | undefined {
  return (model.form ?? []).find(
    (field): field is MediaField =>
      field.kind === "media" && field.media === mode
  )
}

export function tabsOfModel(model: CatalogModel): UpscaleMode[] {
  if (isGraph(model)) {
    return [...upscaleModes]
  }
  return upscaleModes.filter((mode) => mediaOf(model, mode) !== undefined)
}

export function modelsOfTab(
  models: readonly CatalogModel[],
  mode: UpscaleMode
): CatalogModel[] {
  return models.filter((model) => tabsOfModel(model).includes(mode))
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

export function wellNameOf(
  model: CatalogModel | null,
  mode: UpscaleMode
): string {
  return model === null || isGraph(model)
    ? mode
    : (mediaOf(model, mode)?.name ?? mode)
}

export function factorOfValue(value: string | number): number | null {
  if (typeof value === "number") {
    return value > 0 ? value : null
  }
  const match = factorPattern.exec(value.trim())
  const factor = match?.[1] === undefined ? Number.NaN : Number(match[1])
  return Number.isFinite(factor) && factor > 0 ? factor : null
}

function scaleFieldOf(fields: readonly ModelField[]): ModelField | undefined {
  return fields.find(
    (field) =>
      (field.kind === "choice" || field.kind === "number") &&
      (scalePattern.test(field.name) || scalePattern.test(field.path))
  )
}

function numberOptions(
  field: Extract<ModelField, { kind: "number" }>
): ScaleOption[] {
  const min = field.min ?? Number.NEGATIVE_INFINITY
  const max = field.max ?? Number.POSITIVE_INFINITY
  const inRange = factorCandidates.filter((one) => one >= min && one <= max)
  const largest = inRange.at(-1) ?? Number.NEGATIVE_INFINITY
  const top =
    field.max !== null && field.max > largest && field.max > 1
      ? [field.max]
      : []
  const values = [...inRange, ...top]
  const listed = values.length > 0 ? values : [field.default ?? field.min ?? 2]
  return listed.map((value) => ({ value, factor: value }))
}

function hostedScaleOf(fields: readonly ModelField[]): ScaleSpec | null {
  const field = scaleFieldOf(fields)
  if (field === undefined) {
    return null
  }
  if (field.kind === "number") {
    const options = numberOptions(field)
    const initial =
      field.default !== null &&
      options.some((option) => option.value === field.default)
        ? field.default
        : (options[0]?.value ?? null)
    return { name: field.name, options, initial, maxLongSide: null }
  }
  if (field.kind !== "choice") {
    return null
  }
  return {
    name: field.name,
    options: field.options.map((value) => ({
      value,
      factor: factorOfValue(value),
    })),
    initial: field.default ?? field.options[0] ?? null,
    maxLongSide: null,
  }
}

function graphScaleOf(app: AppListing): ScaleSpec | null {
  const input = app.inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === scaleInput && one.type === "choice"
  )
  if (input === undefined) {
    return null
  }
  return {
    name: input.name,
    options: input.options.map((option) => ({
      value: option.value,
      factor: factorOfValue(option.value),
    })),
    initial: input.default,
    maxLongSide,
  }
}

export function scaleOf(
  model: CatalogModel | null,
  app: AppListing
): ScaleSpec | null {
  return model?.form === null || model?.form === undefined
    ? graphScaleOf(app)
    : hostedScaleOf(model.form)
}

export function scaleValueOf(
  spec: ScaleSpec,
  value: FieldValue
): string | number | null {
  const held = spec.options.find(
    (option) =>
      value !== undefined && !Array.isArray(value) && option.value === value
  )
  return held?.value ?? spec.initial
}

export function factorOfScale(
  spec: ScaleSpec | null,
  value: FieldValue
): number | null {
  if (spec === null) {
    return null
  }
  const chosen = scaleValueOf(spec, value)
  return spec.options.find((option) => option.value === chosen)?.factor ?? null
}

export function restFieldsOf(model: CatalogModel | null): ModelField[] {
  if (model?.form === null || model?.form === undefined) {
    return []
  }
  const scale = scaleFieldOf(model.form)
  return model.form.filter(
    (field) =>
      field !== scale &&
      !(
        field.kind === "media" &&
        upscaleModes.some((mode) => mode === field.media)
      )
  )
}

export function inputsForModel(
  app: AppListing,
  model: CatalogModel,
  kept: Inputs,
  mode: UpscaleMode,
  file: readonly string[]
): Record<string, FieldValue> {
  if (isGraph(model)) {
    const base = defaultsOf(app).inputs
    const keep = (name: string): FieldValue => kept[name] ?? base[name]
    const graphScale = graphScaleOf(app)
    const scale =
      graphScale === null ? null : scaleValueOf(graphScale, kept[scaleInput])
    return {
      ...base,
      ...Object.fromEntries(upscaleModes.map((one) => [one, keep(one)])),
      [seedInput]: keep(seedInput),
      ...(scale === null ? {} : { [scaleInput]: scale }),
      [modeInput]: mode,
      [mode]: [...file],
      [modelInput]: model.id,
    }
  }
  return {
    ...Object.fromEntries(upscaleModes.map((one) => [one, kept[one] ?? []])),
    ...hostedDefaults(model.form ?? [], kept),
    [modeInput]: mode,
    [wellNameOf(model, mode)]: [...file],
    [modelInput]: model.id,
  }
}

export function fileOf(
  inputs: Inputs,
  model: CatalogModel | null,
  mode: UpscaleMode
): string[] {
  return listOf(inputs[wellNameOf(model, mode)])
}

export function modeOfModel(
  model: CatalogModel | null,
  mode: UpscaleMode
): UpscaleMode {
  if (model === null) {
    return mode
  }
  const tabs = tabsOfModel(model)
  return tabs.includes(mode) ? mode : (tabs[0] ?? mode)
}
