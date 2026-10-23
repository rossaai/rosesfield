import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { InputValue } from "@rosesfield/contract"
import Ajv from "ajv"
import { describe, expect, it } from "vitest"
import type { ModelField } from "#domain/model-form"
import { bodyOf } from "#infrastructure/router/router-body"
import { fieldsOf, isInternal } from "#infrastructure/router/router-fields"
import {
  fieldOf,
  isObject,
  type Schema,
} from "#infrastructure/router/router-json"
import { placeholdersOf } from "#infrastructure/router/router-placeholders"
import { factsOf, type SchemaFacts } from "#infrastructure/router/router-schema"
import {
  coveredOf,
  covers,
  isHeld,
  type Plan,
  planOf,
  type Reading,
  reachesInto,
} from "./router-schema-plan"

const here = path.dirname(fileURLToPath(import.meta.url))

const folder = path.join(here, "fixtures", "router-schemas")

const listed: readonly string[] = JSON.parse(
  readFileSync(path.join(here, "fixtures", "router-catalog-ids.json"), "utf8")
)

const keyedOnly: readonly string[] = [
  "bria/image-edit-product-holding",
  "bria/image-edit-product-virtual-tryon",
  "bria/image-edit-remove-background-guided",
]

const unrepresentable: Readonly<Record<string, string>> = {
  "pika/pika-2.5-image-to-video":
    "its image is a public https URL, and the form sends the file as a data URI",
}

const recorded: readonly [string, unknown][] = readdirSync(folder)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(path.join(folder, file), "utf8")))
  .map((document) => [factsFor(document).model, document])

function factsFor(document: unknown): SchemaFacts {
  const facts = factsOf(document)
  if (facts === null || facts.request === null) {
    throw new Error("the recorded schema holds no authored request")
  }
  return facts
}

function sampleOf(field: ModelField): InputValue | undefined {
  switch (field.kind) {
    case "prompt":
      return field.default ?? "A calm voice says hello."
    case "text":
      return field.default ?? "sample1"
    case "choice":
      return field.default ?? field.options[0]
    case "number":
      return field.default ?? field.min ?? field.max ?? 1
    case "toggle":
      return field.default === null ? "off" : field.default ? "on" : "off"
    case "media":
      return undefined
  }
}

function filledOf(fields: readonly ModelField[], plan: Plan, attached: string) {
  const asked = new Set(
    plan.paths.flatMap((at) => fields.find((field) => covers(field, at)) ?? [])
  )
  const marked = fields.map((field) => ({
    ...field,
    required: field.required || asked.has(field) || field.name === attached,
  }))
  const inputs: Record<string, InputValue> = {}
  for (const field of marked) {
    const value = sampleOf(field)
    const isDefault = field.kind !== "media" && field.default !== null
    if (value !== undefined && (field.required || isDefault)) {
      inputs[field.name] = value
    }
  }
  for (const [at, value] of plan.pins) {
    const field = fields.find((one) => coveredOf(one).at(-1) === at)
    if (field !== undefined && field.kind !== "media") {
      inputs[field.name] = value
    }
  }
  return { marked, inputs }
}

function withoutInternal(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withoutInternal)
  }
  if (!isObject(value)) {
    return value
  }
  const kept: Schema = Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "nullable" || "type" in value)
      .map(([key, inner]) => [key, withoutInternal(inner)])
  )
  const properties = fieldOf(value, "properties")
  const required = fieldOf(value, "required")
  if (isObject(properties) && Array.isArray(required)) {
    kept.required = required.filter(
      (key) =>
        typeof key !== "string" ||
        !isInternal(key, isObject(properties[key]) ? properties[key] : {})
    )
  }
  return kept
}

function validatorOf(facts: SchemaFacts): Ajv {
  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    validateFormats: false,
  })
  for (const [name, schema] of Object.entries(facts.components)) {
    ajv.addSchema(
      withoutInternal(schema) as object,
      `#/components/schemas/${name}`
    )
  }
  return ajv
}

function missingOf(document: unknown): string[] {
  const facts = factsFor(document)
  const fields = fieldsOf(facts)
  const reading: Reading = {
    fields,
    toward: null,
    isEntered: (at) => reachesInto(fields, at),
  }
  return planOf(
    facts.request ?? {},
    facts.components,
    reading,
    "",
    0
  ).paths.filter((at) => !isHeld(reading, at))
}

async function refusalsOf(document: unknown, attached = ""): Promise<string[]> {
  const facts = factsFor(document)
  const form = { model: facts.model, fields: fieldsOf(facts) }
  const target = form.fields.find((field) => field.name === attached)
  const defaulted = form.fields.filter(
    (field) => field.kind !== "media" && field.default !== null
  )
  const reading: Reading = {
    fields: form.fields,
    toward: target === undefined ? null : (coveredOf(target).at(-1) ?? null),
    isEntered: (at) => reachesInto(defaulted, at),
  }
  const plan = planOf(facts.request ?? {}, facts.components, reading, "", 0)
  const { marked, inputs } = filledOf(form.fields, plan, attached)
  const placed = await placeholdersOf({ ...form, fields: marked }, inputs)
  const body = bodyOf(form, placed.inputs, placed.files)
  const validate = validatorOf(facts).compile(
    withoutInternal(facts.request) as object
  )
  validate(body)
  return (validate.errors ?? []).map(
    (error) => `${error.instancePath} ${error.message}`
  )
}

async function mediaRefusalsOf(document: unknown): Promise<string[]> {
  const media = fieldsOf(factsFor(document)).filter(
    (field) => field.kind === "media"
  )
  const refusals = await Promise.all(
    media.map(async (field) =>
      (await refusalsOf(document, field.name)).map(
        (refusal) => `${field.name}: ${refusal}`
      )
    )
  )
  return refusals.flat()
}

const representable = recorded.filter(([model]) => !(model in unrepresentable))

const refused = recorded.filter(([model]) => model in unrepresentable)

describe("the form of every hosted model the catalog lists", () => {
  it("records a schema for every listed model the public docs serve", () => {
    const held = recorded.map(([model]) => model)
    expect(listed.filter((id) => !held.includes(id))).toEqual(keyedOnly)
  })

  it.each(recorded)(
    "%s: every key the schema requires is a field, in one whole alternative and in each object the form fills",
    (_, document) => {
      expect(missingOf(document)).toEqual([])
    }
  )

  it.each(representable)(
    "%s: a body from the form's defaults and a value for each required field validates",
    async (_, document) => {
      expect(await refusalsOf(document)).toEqual([])
    }
  )

  it.each(representable)(
    "%s: a file in any one media field, with the fields its object requires, validates",
    async (_, document) => {
      expect(await mediaRefusalsOf(document)).toEqual([])
    }
  )

  it.each(refused)(
    "%s: the schema refuses the body the form builds, a named limit",
    async (model, document) => {
      expect(unrepresentable[model]).toBeDefined()
      expect(await refusalsOf(document)).not.toEqual([])
    }
  )
})
