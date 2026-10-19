import {
  type AppListing,
  fixedCountOf,
  type InputDefinition,
  type InputRule,
  inputRulesOf,
  type Run,
} from "@rosesfield/contract"
import {
  type Mode,
  traitNames,
} from "../../../../../packages/catalog/src/characters/traits"

export const modeField = "mode"
export const countInput = "count"

function narrowed(rule: InputRule, mode: Mode): InputDefinition {
  const { input, allowed, fallback } = rule
  if (input.type !== "choice") {
    return input
  }
  if (input.name === modeField) {
    return { ...input, default: mode }
  }
  const options = input.options.filter(
    (option) => allowed?.includes(option.value) ?? true
  )
  const fixed = typeof fallback === "string" ? fallback : input.default
  return { ...input, options, default: fixed }
}

export function listingFor(app: AppListing, mode: Mode): AppListing {
  const inputs = inputRulesOf(app, { [modeField]: mode }).map((rule) =>
    narrowed(rule, mode)
  )
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
