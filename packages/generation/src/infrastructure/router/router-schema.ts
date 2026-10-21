import {
  arrayOf,
  fieldOf,
  isObject,
  type Schema,
  stringOf,
} from "#infrastructure/router/router-json"

export type SchemaFacts = {
  model: string
  takes: string[]
  makes: string[]
  aliasOf: string | null
  isAuthored: boolean
  answersBytes: boolean
  request: Schema | null
  response: Schema | null
  components: Schema
}

export function factsOf(document: unknown): SchemaFacts | null {
  const model = stringOf(fieldOf(document, "x-comfy-router-model-id"))
  if (model === null) {
    return null
  }
  const operation = operationOf(document)
  const components = fieldOf(fieldOf(document, "components"), "schemas")
  const isAuthored = fieldOf(document, "x-comfy-input-schema-authored") === true
  const request = fieldOf(
    fieldOf(
      fieldOf(fieldOf(operation, "requestBody"), "content"),
      "application/json"
    ),
    "schema"
  )
  return {
    model,
    takes: stringsOf(fieldOf(document, "x-comfy-router-input-modalities")),
    makes: stringsOf(fieldOf(document, "x-comfy-router-output-modalities")),
    aliasOf: stringOf(fieldOf(document, "x-comfy-router-alias-of")),
    isAuthored,
    answersBytes: answersBytes(operation),
    request: isAuthored && isObject(request) ? request : null,
    response: responseOf(operation),
    components: isObject(components) ? components : {},
  }
}

export function takesToolsOf(facts: SchemaFacts): boolean {
  if (facts.request === null) {
    return false
  }
  const { properties } = propertiesOf(facts.request, facts.components)
  return Object.hasOwn(properties, "tools")
}

export function resolve(value: unknown, components: Schema): Schema {
  let current = value
  for (let depth = 0; depth < 8; depth += 1) {
    const ref = stringOf(fieldOf(current, "$ref"))
    if (ref === null) {
      break
    }
    current = components[ref.split("/").at(-1) ?? ""]
  }
  if (!isObject(current)) {
    return {}
  }
  const parts = arrayOf(fieldOf(current, "allOf"))
  return parts === null ? current : merged(current, parts, components)
}

export function propertiesOf(
  schema: Schema,
  components: Schema
): { properties: Schema; required: string[] } {
  const resolved = resolve(schema, components)
  const variant = arrayOf(fieldOf(resolved, "oneOf"))?.[0]
  const base =
    fieldOf(resolved, "properties") === undefined && variant !== undefined
      ? resolve(variant, components)
      : resolved
  const properties = fieldOf(base, "properties")
  return {
    properties: isObject(properties) ? properties : {},
    required: stringsOf(fieldOf(base, "required")),
  }
}

export function stringsOf(value: unknown): string[] {
  return (arrayOf(value) ?? []).filter(
    (one): one is string => typeof one === "string"
  )
}

function merged(
  current: Schema,
  parts: readonly unknown[],
  components: Schema
): Schema {
  const { allOf: _, ...rest } = current
  const properties: Schema = {}
  const required: string[] = []
  let first: Schema = {}
  for (const part of parts) {
    const inner = resolve(part, components)
    const found = propertiesOf(inner, components)
    Object.assign(properties, found.properties)
    required.push(...found.required)
    if (Object.keys(first).length === 0) {
      first = inner
    }
  }
  return {
    ...first,
    ...rest,
    ...(Object.keys(properties).length === 0 ? {} : { properties }),
    ...(required.length === 0 ? {} : { required }),
  }
}

function operationOf(document: unknown): unknown {
  const paths = fieldOf(document, "paths")
  const first = isObject(paths) ? Object.values(paths)[0] : undefined
  return fieldOf(first, "post")
}

function responseOf(operation: unknown): Schema | null {
  const schema = fieldOf(
    fieldOf(
      fieldOf(fieldOf(fieldOf(operation, "responses"), "200"), "content"),
      "application/json"
    ),
    "schema"
  )
  return isObject(schema) ? schema : null
}

function answersBytes(operation: unknown): boolean {
  const content = fieldOf(
    fieldOf(fieldOf(operation, "responses"), "200"),
    "content"
  )
  if (!isObject(content)) {
    return false
  }
  const types = Object.keys(content)
  return types.length > 0 && !types.some((type) => type.includes("json"))
}
