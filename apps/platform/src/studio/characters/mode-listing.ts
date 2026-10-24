import { type Mode, traitNames } from "@rosesfield/catalog/characters"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  boundedInputOf,
  fixedCountOf,
  type InputDefinition,
  type InputRule,
  inputRulesOf,
  type Run,
} from "@rosesfield/contract"
import type { FieldValue } from "@/screens/app/app-form"
import { modelInputName } from "@/screens/app/hosted/hosted-form"

export const modeField = "mode"
export const countInput = "count"
export const characterInput = "character"
export const viewInput = "view"

function narrowed(rule: InputRule, mode: Mode): InputDefinition {
  const { input } = rule
  if (input.type !== "choice") {
    return input
  }
  return input.name === modeField
    ? { ...input, default: mode }
    : boundedInputOf(rule)
}

export function listingFor(app: AppListing, mode: Mode): AppListing {
  const inputs = inputRulesOf(app, { [modeField]: mode })
    .filter((rule) => rule.input.name !== viewInput)
    .map((rule) => narrowed(rule, mode))
  const counter = inputs.find((input) => input.name === countInput)
  const isFixed = counter?.type === "choice" && counter.options.length === 1
  const fixed = fixedCountOf({ inputs }, {}) ?? app.output.count.default
  const count = isFixed
    ? { default: fixed, max: fixed }
    : { ...app.output.count, default: fixed }
  return { ...app, inputs, output: { ...app.output, count } }
}

export function modeOfRun(run: Run): Mode {
  return run.inputs[modeField] === "angles" ? "angles" : "traits"
}

export function firstModeOf(
  app: AppListing,
  seeds: { use: string | undefined },
  fromRun: Run | null
): Mode {
  if (fromRun !== null && fromRun.appId === app.id) {
    return modeOfRun(fromRun)
  }
  return seeds.use === undefined ? "traits" : "angles"
}

export function isTrait(input: InputDefinition): boolean {
  return traitNames.some((name) => name === input.name)
}

export function isPanelInput(input: InputDefinition): boolean {
  return (
    input.name !== modeField &&
    input.name !== countInput &&
    input.type !== "seed"
  )
}

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function isChoice(input: InputDefinition): input is ChoiceInput {
  return input.type === "choice"
}

function pickOne<Value>(values: readonly Value[]): Value | undefined {
  const [random = 0] = crypto.getRandomValues(new Uint32Array(1))
  return values[random % values.length]
}

export function randomTraits(app: AppListing): Record<string, string> {
  const picked: Record<string, string> = {}
  for (const input of app.inputs.filter(isTrait).filter(isChoice)) {
    const values = input.options
      .map((option) => option.value)
      .filter((value) => value !== "auto")
    const value = pickOne(values)
    if (value !== undefined) {
      picked[input.name] = value
    }
  }
  return picked
}

export const traitsTask = "text-to-image"

export function traitsModelsOf(
  models: readonly CatalogModel[]
): CatalogModel[] {
  return models.filter((model) => model.task === traitsTask)
}

export function keptInputsOf(
  app: AppListing,
  inputs: Readonly<Record<string, FieldValue>>,
  next: CatalogModel | undefined
): Array<[string, FieldValue]> {
  const taken = new Set([
    modelInputName,
    ...(next?.form ?? []).map((field) => field.name),
  ])
  return app.inputs.flatMap((input): Array<[string, FieldValue]> => {
    const value = inputs[input.name]
    return taken.has(input.name) || value === undefined
      ? []
      : [[input.name, value]]
  })
}
