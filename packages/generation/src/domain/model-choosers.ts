import type { AppDefinition } from "@rosesfield/contract"
import type { ModelForm } from "#domain/model-form"
import { taskInputOf } from "#domain/task-binding"

export type ChooserInputs = {
  inputs: Record<string, string>
  rest: Record<string, unknown>
  issues: string[]
}

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

function isChoiceOf(
  app: AppDefinition,
  name: string,
  value: unknown
): value is string {
  const input = app.inputs.find((one) => one.name === name)
  return (
    input?.type === "choice" &&
    typeof value === "string" &&
    input.options.some((option) => option.value === value)
  )
}

export function chooserInputsOf(
  app: AppDefinition,
  given: Readonly<Record<string, unknown>>,
  form: ModelForm
): ChooserInputs {
  const own = new Set(form.fields.map((field) => field.name))
  const names = chooserNamesOf(app).filter(
    (name) => !own.has(name) && given[name] !== undefined
  )
  const inputs: Record<string, string> = {}
  const issues: string[] = []
  for (const name of names) {
    const value = given[name]
    if (isChoiceOf(app, name, value)) {
      inputs[name] = value
    } else {
      issues.push(`${name}: the value is not one of the app's choices`)
    }
  }
  const rest = Object.fromEntries(
    Object.entries(given).filter(([name]) => !names.includes(name))
  )
  return { inputs, rest, issues }
}
