import type { InputValue, RunInputs } from "@rosesfield/contract"
import { type FieldRole, fieldOfRole } from "#domain/field-role"
import type { ModelField, ModelForm } from "#domain/model-form"

export type RateRow = {
  model: string
  credits: number
  unit: string
  conditions: string
}

export type Values = ReadonlyMap<string, string>

export type Fit = "holds" | "names-output" | "open" | "free" | null

export type Score = { holds: number; open: number }

export type RunFacts = {
  model: string
  values: Values
  inputs: RunInputs
  seconds: number | null
}

const outputSizeKey = "outputsize"

const output =
  /^(output (image|video)( duration)?|(image|video) generation|generated image|generation|completed output duration)$/i

/**
 * A setting the rate card names by another word than the model's form does:
 * the card's key, then the form's key, for every model of the maker.
 */
const cardNames: readonly { maker: string; card: string; form: string }[] = [
  { maker: "ideogram/", card: "quality", form: "renderingspeed" },
  { maker: "beeble/", card: "resolution", form: "maxresolution" },
]

/** The most runs a rate card is read for, one per value of each unset setting. */
const filledRunsMax = 64

export function keyOf(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9.]/g, "")
}

function formKeyOf(field: ModelField): string {
  return keyOf(field.path.split(".").at(-1) ?? field.name)
}

/** Says which form key the card's key reads on this model. */
function formKeyFor(model: string, card: string): string {
  return (
    cardNames.find((one) => model.startsWith(one.maker) && one.card === card)
      ?.form ?? card
  )
}

export function chosenOf(
  name: string,
  inputs: RunInputs,
  field: ModelField
): string | number | boolean | null {
  const given = inputs[name]
  if (given !== undefined && !Array.isArray(given)) {
    return given
  }
  return "default" in field ? field.default : null
}

export function valuesOf(form: ModelForm, inputs: RunInputs): Values {
  const values = new Map<string, string>()
  for (const field of form.fields) {
    const chosen = chosenOf(field.name, inputs, field)
    const value =
      field.kind === "toggle" && typeof chosen === "string"
        ? String(chosen === "on")
        : chosen
    const key = formKeyOf(field)
    if (value !== null && value !== undefined && !values.has(key)) {
      values.set(key, keyOf(String(value)))
    }
  }
  for (const name of cardNames) {
    const held = values.get(name.form)
    if (form.model.startsWith(name.maker) && held !== undefined) {
      values.set(name.card, held)
    }
  }
  const size = outputSizeOf(form, inputs)
  if (size !== null && !values.has(outputSizeKey)) {
    values.set(outputSizeKey, size)
  }
  return values
}

function outputSizeOf(form: ModelForm, inputs: RunInputs): string | null {
  const field = fieldOfRole(form.fields, "resolution", "image")
  const value = field === null ? null : chosenOf(field.name, inputs, field)
  return value === null ? null : sizeClassOf(String(value))
}

export function sizeClassOf(value: string): string | null {
  const text = value.toLowerCase().trim()
  if (/^\d+(\.\d+)?k$/.test(text)) {
    return text
  }
  const sized = /^(\d+)\s*[x*]\s*(\d+)$/.exec(text)
  if (sized === null) {
    return null
  }
  const long = Math.max(Number(sized[1]), Number(sized[2]))
  if (long <= 1536) {
    return "1k"
  }
  return long <= 2560 ? "2k" : "4k"
}

export function roleNumber(
  form: ModelForm,
  inputs: RunInputs,
  role: FieldRole
): number | null {
  const field = fieldOfRole(form.fields, role, "video")
  if (field === null) {
    return null
  }
  const value = Number.parseFloat(String(chosenOf(field.name, inputs, field)))
  return Number.isFinite(value) ? value : null
}

export function numberIn(
  values: Values,
  keys: readonly string[]
): number | null {
  for (const key of keys) {
    const held = Number.parseFloat(values.get(key) ?? "")
    if (Number.isFinite(held)) {
      return held
    }
  }
  return null
}

export function factsOf(form: ModelForm, inputs: RunInputs): RunFacts {
  const values = valuesOf(form, inputs)
  return {
    model: form.model,
    values,
    inputs,
    seconds:
      roleNumber(form, inputs, "length") ?? numberIn(values, ["duration"]),
  }
}

export function scoreOf(conditions: string, run: RunFacts): Score | null {
  const score: Score = { holds: 0, open: 0 }
  for (const raw of conditions.split(";")) {
    const part = raw.trim()
    if (part === "") {
      continue
    }
    const fit = fitOf(part, run)
    if (fit === null) {
      return null
    }
    score.holds += fit === "holds" ? 1 : 0
    score.open += fit === "open" || fit === "free" ? 1 : 0
  }
  return score
}

function fitOf(part: string, run: RunFacts): Fit {
  const { values, inputs } = run
  if (output.test(part)) {
    return "names-output"
  }
  const pair = /^([A-Za-z_ ]+)=(.+)$/.exec(part)
  if (pair !== null) {
    const held = values.get(keyOf(pair[1] ?? ""))
    if (held === undefined) {
      return "open"
    }
    return held === keyOf(pair[2] ?? "") ? "holds" : null
  }
  const seconds = /^(\d+)s$/.exec(part)
  if (seconds !== null) {
    if (run.seconds === null) {
      return "open"
    }
    return run.seconds === Number(seconds[1]) ? "holds" : null
  }
  if (/^\d+p$/i.test(part)) {
    const resolution = values.get("resolution")
    if (resolution === undefined) {
      return "open"
    }
    return resolution === keyOf(part) ? "holds" : null
  }
  const hasMedia = Object.values(inputs).some(
    (value) => Array.isArray(value) && value.length > 0
  )
  if (/^(text[ -]to[ -](image|video))$/i.test(part)) {
    return hasMedia ? null : "holds"
  }
  if (/^(edit|image[ -]to[ -]video)$/i.test(part)) {
    return hasMedia ? "holds" : null
  }
  return "free"
}

/** Lists the form keys a card's conditions name, as the form spells them. */
export function namedKeysOf(model: string, conditions: readonly string[]) {
  const keys = new Set<string>()
  for (const condition of conditions) {
    for (const raw of condition.split(";")) {
      const part = raw.trim()
      const pair = /^([A-Za-z_ ]+)=/.exec(part)
      if (pair !== null) {
        keys.add(formKeyFor(model, keyOf(pair[1] ?? "")))
      } else if (/^\d+p$/i.test(part)) {
        keys.add("resolution")
      }
    }
  }
  return keys
}

function valuesToTry(field: ModelField): readonly InputValue[] {
  switch (field.kind) {
    case "choice":
      return field.options
    case "toggle":
      return ["on", "off"]
    case "number":
      return field.min === null || field.max === null
        ? []
        : [field.min, field.max]
    default:
      return []
  }
}

function isUnset(field: ModelField, inputs: RunInputs): boolean {
  return chosenOf(field.name, inputs, field) === null
}

export type FilledRuns = {
  runs: RunInputs[]
  /** True when the runs were cut at the most a card is read for, so some combinations were not read. */
  cut: boolean
}

function openFieldsOf(
  form: ModelForm,
  inputs: RunInputs,
  keys: ReadonlySet<string>,
  needsSeconds: boolean
): ModelField[] {
  const length = fieldOfRole(form.fields, "length", "video")
  return form.fields.filter(
    (field) =>
      isUnset(field, inputs) &&
      valuesToTry(field).length > 0 &&
      (keys.has(formKeyOf(field)) || (needsSeconds && field === length))
  )
}

/**
 * Fills every setting the card prices on that the run leaves unset and the
 * form gives no default: one run per value the setting takes, so the card's
 * rows can be read for each. A run with nothing to fill is the run itself.
 * Past the most a card is read for, the runs are cut and marked so.
 */
export function filledRunsOf(
  form: ModelForm,
  inputs: RunInputs,
  keys: ReadonlySet<string>,
  needsSeconds: boolean
): FilledRuns {
  let runs: RunInputs[] = [inputs]
  let cut = false
  for (const field of openFieldsOf(form, inputs, keys, needsSeconds)) {
    const all = runs.flatMap((run) =>
      valuesToTry(field).map((value) => ({ ...run, [field.name]: value }))
    )
    cut ||= all.length > filledRunsMax
    runs = all.slice(0, filledRunsMax)
  }
  return { runs, cut }
}

/**
 * The run with every setting the filled runs would vary set to its highest
 * number, where its values are numbers, so seconds, frame rate and count
 * read at their largest. A setting with values that are not numbers stays
 * unset, so every row it names still fits.
 */
export function highestInputsOf(
  form: ModelForm,
  inputs: RunInputs,
  keys: ReadonlySet<string>,
  needsSeconds: boolean
): RunInputs {
  const highest: Record<string, InputValue> = { ...inputs }
  for (const field of openFieldsOf(form, inputs, keys, needsSeconds)) {
    const numbers = valuesToTry(field).map((value) =>
      typeof value === "number" ? value : Number(value)
    )
    if (numbers.every((value) => Number.isFinite(value))) {
      highest[field.name] = Math.max(...numbers)
    }
  }
  return highest
}
