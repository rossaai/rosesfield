import { isHostedModelId } from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  appliedInputsOf,
  type InputDefinition,
  isChainFilled,
  type Run,
  type startRunBody,
  whenHolds,
} from "@rosesfield/contract"
import type { SchemaInput } from "@/api/call-route"
import { defaultAspectOf } from "@/catalog/app-facts"
import type { CopyKey } from "@/copy.en"
import { modelInputName } from "@/pieces/run/run-facts"
import { inputSentValueOf } from "@/screens/app/setting-table"

export type FieldValue = string | number | string[] | undefined

export type FormValues = {
  inputs: Readonly<Record<string, FieldValue>>
  seedMode: "random" | "fixed"
  count: number
  aspectRatio: string | null
}

export type StartRunBodyInput = SchemaInput<typeof startRunBody>

export type FieldProblem = {
  name: string
  key: CopyKey
  values: Readonly<Record<string, string | number>>
}

export const countField = "count"
export const aspectField = "aspectRatio"

function defaultOf(input: InputDefinition): FieldValue {
  switch (input.type) {
    case "prompt":
      return ""
    case "image":
    case "video":
    case "audio":
    case "character":
      return []
    case "choice":
    case "number":
      return input.default
    case "toggle":
      return inputSentValueOf(input.name, input.type) ?? input.default
    case "seed":
      return undefined
  }
}

export function defaultsOf(app: AppListing): FormValues {
  return {
    inputs: Object.fromEntries(
      app.inputs.map((input) => [input.name, defaultOf(input)])
    ),
    seedMode: "random",
    count: app.output.count.default,
    aspectRatio: defaultAspectOf(app),
  }
}

export function isHostedRun(run: Run): boolean {
  const model = run.inputs[modelInputName]
  return typeof model === "string" && isHostedModelId(model)
}

export function valuesFromRun(app: AppListing, run: Run): FormValues {
  const base = defaultsOf(app)
  if (isHostedRun(run)) {
    return { ...base, inputs: { ...run.inputs }, count: run.count }
  }
  const inputs: Record<string, FieldValue> = { ...base.inputs }
  for (const input of app.inputs) {
    const value = run.inputs[input.name]
    if (value !== undefined) {
      inputs[input.name] = Array.isArray(value) ? [...value] : value
    }
  }
  const seedInput = app.inputs.find((input) => input.type === "seed")
  if (seedInput !== undefined && run.seed !== null) {
    inputs[seedInput.name] = run.seed
  }
  return {
    inputs,
    seedMode: seedInput !== undefined && run.seed !== null ? "fixed" : "random",
    count: run.count,
    aspectRatio: run.aspectRatio ?? base.aspectRatio,
  }
}

function listOf(value: FieldValue): string[] {
  return Array.isArray(value) ? value : []
}

function valueFor(input: InputDefinition, values: FormValues): FieldValue {
  const value = values.inputs[input.name]
  if (input.type === "seed") {
    return values.seedMode === "fixed" && typeof value === "number"
      ? value
      : undefined
  }
  if (input.type === "prompt") {
    return typeof value === "string" &&
      (value !== "" || input.presence === "required")
      ? value
      : undefined
  }
  return value
}

export function bodyOf(app: AppListing, values: FormValues): StartRunBodyInput {
  const inputs: Record<string, string | number | string[]> = {}
  for (const input of app.inputs) {
    const value = valueFor(input, values)
    if (value !== undefined) {
      inputs[input.name] = value
    }
  }
  const output = app.output
  return {
    inputs,
    ...(output.count.max > 1 ? { count: values.count } : {}),
    ...((output.kind === "image" || output.kind === "video") &&
    values.aspectRatio !== null
      ? { aspectRatio: values.aspectRatio }
      : {}),
  }
}

function problemOf(
  input: InputDefinition,
  value: FieldValue
): FieldProblem | null {
  const name = input.name
  switch (input.type) {
    case "prompt": {
      const text = typeof value === "string" ? value : ""
      if (input.presence === "required" && text.trim() === "") {
        return { name, key: "field.prompt.required", values: {} }
      }
      return text.length > input.maxLength
        ? {
            name,
            key: "field.prompt.count",
            values: { count: text.length, max: input.maxLength },
          }
        : null
    }
    case "image":
    case "video":
    case "audio":
    case "character":
      return listProblem(input, listOf(value))
    case "number":
      return typeof value === "number" &&
        (value < input.min || value > input.max)
        ? {
            name,
            key: "field.number.outOfRange",
            values: { min: input.min, max: input.max },
          }
        : null
    default:
      return null
  }
}

function listProblem(
  input: Extract<InputDefinition, { max: number; presence: string }>,
  list: readonly string[]
): FieldProblem | null {
  if (list.length > input.max) {
    return {
      name: input.name,
      key: "field.asset.tooMany",
      values: { max: input.max },
    }
  }
  if (input.presence === "required" && list.length === 0) {
    const key =
      input.type === "character"
        ? "field.character.required"
        : "field.asset.required"
    return { name: input.name, key, values: {} }
  }
  return null
}

export function problemsOf(
  app: AppListing,
  values: FormValues
): FieldProblem[] {
  return app.inputs
    .map((input) => problemOf(input, values.inputs[input.name]))
    .filter((problem): problem is FieldProblem => problem !== null)
}

/** The problems of the inputs a person fills: a run chain fills its own inputs, so none of them is a person's problem. */
export function heldProblemsOf(
  app: AppListing,
  values: FormValues
): FieldProblem[] {
  const held = app.inputs.filter(
    (input) =>
      !isChainFilled(input) &&
      (input.type === "seed" || whenHolds(input.when, values.inputs))
  )
  return problemsOf({ ...app, inputs: held }, values)
}

export function heldValuesOf(app: AppListing, values: FormValues): FormValues {
  const held = app.inputs.filter(
    (input) => input.type === "seed" || whenHolds(input.when, values.inputs)
  )
  return {
    ...values,
    inputs: Object.fromEntries(
      held.map((input) => [input.name, values.inputs[input.name]])
    ),
  }
}

export function appliedApp(
  app: AppListing,
  inputs: Readonly<Record<string, FieldValue>>
): AppListing {
  return { ...app, inputs: appliedInputsOf(app, inputs) }
}
