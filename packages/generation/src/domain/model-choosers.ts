import {
  type AppDefinition,
  describeWhen,
  type InputDefinition,
  type InputValue,
  whenHolds,
} from "@rosesfield/contract"
import { characterIdFormat } from "@rosesfield/kernel"
import type { ModelForm } from "#domain/model-form"
import { taskInputOf } from "#domain/task-binding"

export type ChooserInputs = {
  inputs: Record<string, InputValue>
  rest: Record<string, unknown>
  issues: string[]
}

type Kept = Extract<InputDefinition, { type: "choice" | "character" }>

function chooserNamesOf(app: AppDefinition): string[] {
  const name = taskInputOf(app.engine)
  const chooser = app.inputs.find((input) => input.name === name)
  const bounds = chooser?.type === "choice" ? (chooser.bounds ?? []) : []
  return [
    ...new Set(
      bounds.flatMap((bound) => bound.when.map((condition) => condition.input))
    ),
  ]
}

function isKept(input: InputDefinition, choosers: readonly string[]): boolean {
  if (input.type !== "choice" && input.type !== "character") {
    return false
  }
  if (choosers.includes(input.name)) {
    return true
  }
  const when = input.when ?? []
  return (
    when.length > 0 &&
    when.every((condition) => choosers.includes(condition.input))
  )
}

function keptInputsOf(app: AppDefinition): Kept[] {
  const choosers = chooserNamesOf(app)
  return app.inputs.filter((input): input is Kept => isKept(input, choosers))
}

function isChoiceValue(input: Kept, value: unknown): value is string {
  return (
    input.type === "choice" &&
    typeof value === "string" &&
    input.options.some((option) => option.value === value)
  )
}

function isCharacterList(input: Kept, value: unknown): value is string[] {
  return (
    input.type === "character" &&
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= input.max &&
    value.every((one) => characterIdFormat.is(one))
  )
}

function isHeld(
  input: Kept,
  given: Readonly<Record<string, unknown>>
): boolean {
  return input.when === undefined || whenHolds(input.when, given)
}

function problemOf(
  input: Kept,
  given: Readonly<Record<string, unknown>>
): string {
  if (input.when !== undefined && !isHeld(input, given)) {
    return `${input.name} applies only when ${describeWhen(input.when)}`
  }
  return input.type === "choice"
    ? `${input.name}: the value is not one of the app's choices`
    : `${input.name}: 1 to ${input.max} saved characters`
}

export function chooserInputsOf(
  app: AppDefinition,
  given: Readonly<Record<string, unknown>>,
  form: ModelForm
): ChooserInputs {
  const own = new Set(form.fields.map((field) => field.name))
  const kept = keptInputsOf(app).filter(
    (input) => !own.has(input.name) && given[input.name] !== undefined
  )
  const inputs: Record<string, InputValue> = {}
  const issues: string[] = []
  for (const input of kept) {
    const value = given[input.name]
    if (
      isHeld(input, given) &&
      (isChoiceValue(input, value) || isCharacterList(input, value))
    ) {
      inputs[input.name] = value
    } else {
      issues.push(problemOf(input, given))
    }
  }
  const names = new Set(kept.map((input) => input.name))
  const rest = Object.fromEntries(
    Object.entries(given).filter(([name]) => !names.has(name))
  )
  return { inputs, rest, issues }
}
