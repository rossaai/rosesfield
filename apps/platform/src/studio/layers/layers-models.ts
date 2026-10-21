import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing, Run } from "@rosesfield/contract"
import {
  type FieldProblem,
  type FieldValue,
  type FormValues,
  type StartRunBodyInput,
  valuesFromRun,
} from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import {
  hostedBody,
  hostedDefaults,
  hostedProblems,
  modelInputName,
} from "@/screens/app/hosted/hosted-form"
import type { FormCheck } from "@/screens/app/use-app-form"
import {
  isLayersMode,
  type LayersMode,
  layerInput,
  modeInput,
  sourceInput,
} from "@/studio/layers/layers-modes"

type MediaField = Extract<ModelField, { kind: "media" }>

type Inputs = Readonly<Record<string, FieldValue>>

const modeTasks: Readonly<Record<string, LayersMode>> = {
  "layer-separation": "split",
  "image-edit": "edit",
  relight: "relight",
  inpaint: "fill",
}

const maskPattern = /mask/i

function isMask(field: MediaField): boolean {
  return maskPattern.test(field.name) || maskPattern.test(field.path)
}

function imagesOf(model: CatalogModel): MediaField[] {
  return (model.form ?? []).filter(
    (field): field is MediaField =>
      field.kind === "media" && field.media === "image"
  )
}

export function isGraphModel(model: CatalogModel | null): boolean {
  return model === null || model.form === null
}

export function maskFieldOf(model: CatalogModel): MediaField | null {
  return imagesOf(model).find(isMask) ?? null
}

export function imageFieldOf(model: CatalogModel): MediaField | null {
  const images = imagesOf(model).filter((field) => !isMask(field))
  return images.find((field) => field.required) ?? images[0] ?? null
}

export function modeOfModel(model: CatalogModel): LayersMode | null {
  const mode = modeTasks[model.task] ?? null
  return mode === "edit" && maskFieldOf(model) !== null ? "fill" : mode
}

export function modelsOfMode(
  models: readonly CatalogModel[],
  mode: LayersMode
): CatalogModel[] {
  return models.filter((model) => modeOfModel(model) === mode)
}

export function defaultOfMode(
  models: readonly CatalogModel[],
  mode: LayersMode
): CatalogModel | null {
  const listed = modelsOfMode(models, mode)
  return listed.find((model) => model.kind === "graph") ?? listed[0] ?? null
}

export function isCountShown(
  mode: LayersMode,
  chosen: CatalogModel | null
): boolean {
  return mode === "split" && isGraphModel(chosen)
}

function ownFieldsOf(model: CatalogModel): ModelField[] {
  return (model.form ?? []).filter((field) => field.kind !== "media")
}

export function shownFieldsOf(model: CatalogModel | null): ModelField[] {
  return model === null ? [] : ownFieldsOf(model)
}

export function inputsForModel(
  kept: Inputs,
  model: CatalogModel
): Record<string, FieldValue> {
  const own =
    model.form === null ? {} : hostedDefaults(ownFieldsOf(model), kept)
  return { ...kept, ...own, [modelInputName]: model.id }
}

function drivenInput(mode: LayersMode): string {
  return mode === "split" ? sourceInput : layerInput
}

export function hostedLayersBody(
  model: CatalogModel,
  values: FormValues,
  mode: LayersMode,
  mask: readonly string[]
): StartRunBodyInput {
  const body = hostedBody(
    model.id,
    ownFieldsOf(model),
    { ...values, count: 1 },
    "image"
  )
  const inputs: Record<string, string | number | string[]> = {
    ...body.inputs,
  }
  const image = imageFieldOf(model)
  const picked = listOf(values.inputs[drivenInput(mode)])
  if (image !== null && picked.length > 0) {
    inputs[image.name] = picked
  }
  const maskField = maskFieldOf(model)
  if (maskField !== null && mask.length > 0) {
    inputs[maskField.name] = [...mask]
  }
  return { ...body, inputs }
}

export function hostedLayersProblems(
  model: CatalogModel,
  values: FormValues,
  mode: LayersMode
): FieldProblem[] {
  const problems = hostedProblems(ownFieldsOf(model), values)
  const driven = drivenInput(mode)
  if (
    imageFieldOf(model) !== null &&
    listOf(values.inputs[driven]).length === 0
  ) {
    problems.push({ name: driven, key: "field.asset.required", values: {} })
  }
  return problems
}

export function runModeOf(
  run: Run,
  models: readonly CatalogModel[]
): LayersMode {
  const mode = run.inputs[modeInput]
  if (isLayersMode(mode)) {
    return mode
  }
  const id = run.inputs[modelInputName]
  const model = models.find((one) => one.id === id)
  return (model === undefined ? null : modeOfModel(model)) ?? "split"
}

export function runImageOf(run: Run, model: CatalogModel): string[] {
  const image = imageFieldOf(model)
  const value = image === null ? undefined : run.inputs[image.name]
  return Array.isArray(value) ? [...value] : []
}

export function checkOf(
  chosen: CatalogModel | null,
  mode: LayersMode
): FormCheck | null {
  return chosen === null || isGraphModel(chosen)
    ? null
    : (values) => hostedLayersProblems(chosen, values, mode)
}

export function layersValuesOf(
  app: AppListing,
  run: Run,
  models: readonly CatalogModel[]
): FormValues {
  const values = valuesFromRun(app, run)
  const mode = runModeOf(run, models)
  const id = run.inputs[modelInputName]
  const model = models.find((one) => one.id === id)
  const image =
    model === undefined || isGraphModel(model) ? [] : runImageOf(run, model)
  const driven = mode === "split" ? sourceInput : layerInput
  return {
    ...values,
    inputs: {
      ...values.inputs,
      [modeInput]: mode,
      ...(typeof id === "string" ? { [modelInputName]: id } : {}),
      ...(image.length === 0 ? {} : { [driven]: image }),
    },
  }
}
