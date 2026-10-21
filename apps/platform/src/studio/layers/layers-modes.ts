import {
  type AppListing,
  fixedCountOf,
  type InputDefinition,
  inputRulesOf,
  whenHolds,
} from "@rosesfield/contract"
import {
  bodyOf,
  type FormValues,
  type StartRunBodyInput,
} from "@/screens/app/app-form"
import { modelInputName } from "@/screens/app/hosted/hosted-form"

export type LayersMode = "split" | "edit" | "relight" | "fill"

export const modeInput = "mode"
export const countInput = "count"
export const sourceInput = "source"
export const layerInput = "layer"
export const maskInput = "mask"

export const layersModes: readonly LayersMode[] = [
  "split",
  "edit",
  "relight",
  "fill",
]

const ownControls: readonly string[] = [
  modeInput,
  modelInputName,
  countInput,
  layerInput,
  maskInput,
]

const boundedInputs: readonly string[] = [countInput, modelInputName]

export function isLayersMode(value: unknown): value is LayersMode {
  return layersModes.some((mode) => mode === value)
}

export function modeOf(values: FormValues): LayersMode {
  const value = values.inputs[modeInput]
  return isLayersMode(value) ? value : "split"
}

function appliesIn(input: InputDefinition, mode: LayersMode): boolean {
  return input.type === "seed" || whenHolds(input.when, { [modeInput]: mode })
}

function optional(input: InputDefinition): InputDefinition {
  switch (input.type) {
    case "prompt":
    case "image":
      return { ...input, presence: "optional" }
    default:
      return input
  }
}

export function formAppFor(app: AppListing, mode: LayersMode): AppListing {
  return {
    ...app,
    inputs: app.inputs.map((input) =>
      appliesIn(input, mode) && input.name !== maskInput
        ? input
        : optional(input)
    ),
  }
}

export function bodyAppFor(app: AppListing, mode: LayersMode): AppListing {
  return {
    ...app,
    inputs: app.inputs.filter((input) => appliesIn(input, mode)),
  }
}

export function shownInputsOf(
  app: AppListing,
  mode: LayersMode
): InputDefinition[] {
  return formAppFor(app, mode).inputs.filter(
    (input) =>
      input.type !== "seed" &&
      !ownControls.includes(input.name) &&
      appliesIn(input, mode)
  )
}

export type CountRange = { min: number; max: number }

export function countRangeOf(app: AppListing, mode: LayersMode): CountRange {
  const rule = inputRulesOf(app, { [modeInput]: mode }).find(
    (one) => one.input.name === countInput
  )
  const counts = (rule?.allowed ?? []).map(Number)
  const fallback = app.output.count.default
  return {
    min: counts.length === 0 ? fallback : Math.min(...counts),
    max: counts.length === 0 ? fallback : Math.max(...counts),
  }
}

export function layersBodyOf(
  app: AppListing,
  mode: LayersMode,
  values: FormValues
): StartRunBodyInput {
  const body = bodyOf(bodyAppFor(app, mode), values)
  const rules = inputRulesOf(app, body.inputs)
  const inputs = { ...body.inputs }
  for (const name of boundedInputs) {
    const rule = rules.find((one) => one.input.name === name)
    const chosen = inputs[name]
    const allowed = rule?.allowed ?? []
    const kept =
      typeof chosen === "string" && allowed.includes(chosen)
        ? chosen
        : rule?.fallback
    if (typeof kept === "string") {
      inputs[name] = kept
    }
  }
  return {
    ...body,
    inputs,
    count: fixedCountOf(app, inputs) ?? app.output.count.default,
  }
}

export function layerCountOf(
  app: AppListing,
  mode: LayersMode,
  values: FormValues
): number {
  return layersBodyOf(app, mode, values).count ?? app.output.count.default
}
