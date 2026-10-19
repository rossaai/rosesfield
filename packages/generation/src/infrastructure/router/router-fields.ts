import type { ModelField } from "#domain/model-form"
import {
  depthOf,
  mediaAt,
  promptAt,
  rankOf,
  scalarOf,
  withFreeName,
} from "#infrastructure/router/router-field-leaf"
import {
  arrayOf,
  fieldOf,
  isObject,
  numberOf,
  type Schema,
  stringOf,
} from "#infrastructure/router/router-json"
import {
  propertiesOf,
  resolve,
  type SchemaFacts,
  stringsOf,
} from "#infrastructure/router/router-schema"

type Walk = {
  components: Schema
  fields: ModelField[]
}

type Spot = {
  path: string
  key: string
  required: boolean
}

const maxDepth = 4

const internalKeys: readonly string[] = [
  "model",
  "model_name",
  "model_id",
  "model_version",
  "callback_url",
  "webhook_url",
  "webhook_secret",
  "stream",
  "response_format",
  "idempotency_key",
  "external_task_id",
  "user",
  "sync",
  "store",
  "partial_images",
  "uploadImagesToStorage",
  "version",
  "tools",
  "tool_choice",
]

const internalNote =
  /Comfy Router supplies|Router writes|Router forces|Comfy coerces|omit it there/i

const mediaKey = /(image|video|audio|mask|frame|sound|garment|person|file)/i

const notMediaKey =
  /(prompt|strength|count|num|size|ratio|weight|format|type|mode|gcs|id$)/i

const mediaNote = /(url|uri|base64|data:)/i

export function fieldsOf(facts: SchemaFacts): ModelField[] {
  if (facts.request === null) {
    return []
  }
  const walk: Walk = { components: facts.components, fields: [] }
  walkObject(walk, facts.request, "", 0, true)
  const seen = new Set<string>()
  return [...walk.fields]
    .sort((a, b) => depthOf(a) - depthOf(b))
    .map((field) => withFreeName(field, seen))
    .sort((a, b) => rankOf(a) - rankOf(b))
}

function walkObject(
  walk: Walk,
  schema: Schema,
  prefix: string,
  depth: number,
  isRequired: boolean
): void {
  const { properties, required } = propertiesOf(schema, walk.components)
  for (const [key, raw] of Object.entries(properties)) {
    const spot: Spot = {
      path: `${prefix}${key}`,
      key,
      required: isRequired && required.includes(key),
    }
    walkProperty(walk, resolve(raw, walk.components), spot, depth)
  }
}

function walkProperty(
  walk: Walk,
  schema: Schema,
  spot: Spot,
  depth: number
): void {
  if (isInternal(spot.key, schema)) {
    return
  }
  const leaf = leafOf(walk, schema, spot)
  if (leaf !== null) {
    walk.fields.push(leaf)
    return
  }
  if (depth >= maxDepth) {
    return
  }
  if (isObject(fieldOf(schema, "properties")) || hasParts(schema)) {
    walkObject(walk, schema, `${spot.path}.`, depth + 1, spot.required)
    return
  }
  const item = itemOf(schema, walk.components)
  if (item !== null) {
    walkList(walk, item, spot, depth)
  }
}

function walkList(walk: Walk, item: Schema, spot: Spot, depth: number): void {
  const { properties } = propertiesOf(item, walk.components)
  const role = stringsOf(
    fieldOf(resolve(properties.role, walk.components), "enum")
  )
  if (role.includes("user")) {
    walkMessage(walk, properties, spot, depth)
    return
  }
  const tags = stringsOf(
    fieldOf(resolve(properties.type, walk.components), "enum")
  )
  if (tags.length > 0 && tags.some((tag) => tag in properties)) {
    walkTagged(walk, properties, tags, spot)
    return
  }
  if ("text" in properties) {
    walkParts(walk, properties, spot)
    return
  }
  walkObject(walk, item, `${spot.path}.0.`, depth + 1, spot.required)
}

function walkMessage(
  walk: Walk,
  properties: Schema,
  spot: Spot,
  depth: number
): void {
  const key = "parts" in properties ? "parts" : "content"
  const inner = resolve(properties[key], walk.components)
  const path = `${spot.path}.0.{role=user}.${key}`
  const item = itemOf(inner, walk.components)
  if (item !== null && depth < maxDepth) {
    walkParts(walk, propertiesOf(item, walk.components).properties, {
      ...spot,
      path,
    })
    return
  }
  walk.fields.push(promptAt(path, spot.required))
}

function walkTagged(
  walk: Walk,
  properties: Schema,
  tags: readonly string[],
  spot: Spot
): void {
  for (const tag of tags) {
    const holder = resolve(properties[tag], walk.components)
    if (tag === "text") {
      walk.fields.push(
        promptAt(`${spot.path}.[].{type=text}.text`, spot.required)
      )
    } else if (
      isObject(fieldOf(holder, "properties")) &&
      "url" in propertiesOf(holder, walk.components).properties
    ) {
      walk.fields.push(
        mediaAt(`${spot.path}.[].{type=${tag}}.${tag}.url`, tag, 1, 4)
      )
    }
  }
}

function walkParts(walk: Walk, properties: Schema, spot: Spot): void {
  if ("text" in properties) {
    walk.fields.push(promptAt(`${spot.path}.[].text`, spot.required))
  }
  for (const key of Object.keys(properties)) {
    if (key === "inlineData") {
      walk.fields.push(
        mediaAt(`${spot.path}.[].inlineData.@inline`, "image", 1, 4)
      )
    } else if (key !== "text" && mediaKey.test(key) && !notMediaKey.test(key)) {
      walk.fields.push(mediaAt(`${spot.path}.[].${key}`, key, 1, 4))
    }
  }
}

function leafOf(walk: Walk, schema: Schema, spot: Spot): ModelField | null {
  const base = {
    name: spot.key,
    path: spot.path,
    required: spot.required,
  }
  const options = (arrayOf(fieldOf(schema, "enum")) ?? []).filter(
    (one): one is string | number =>
      typeof one === "string" || typeof one === "number"
  )
  if (options.length > 0) {
    const fallback = fieldOf(schema, "default")
    return {
      ...base,
      kind: "choice",
      options,
      default:
        typeof fallback === "string" || typeof fallback === "number"
          ? fallback
          : null,
    }
  }
  const media = mediaOf(walk, schema, spot)
  if (media !== null) {
    return media
  }
  return scalarOf(base, schema, typeOf(schema, walk.components), spot.key)
}

function mediaOf(walk: Walk, schema: Schema, spot: Spot): ModelField | null {
  const named = mediaKey.test(spot.path) && !notMediaKey.test(spot.key)
  const note = stringOf(fieldOf(schema, "description")) ?? ""
  if (!named || !mediaNote.test(note)) {
    return null
  }
  const shapes = [schema, ...variantsOf(schema)].map((one) =>
    resolve(one, walk.components)
  )
  const isSingle = shapes.some((one) => fieldOf(one, "type") === "string")
  const list = shapes.find(
    (one) =>
      fieldOf(one, "type") === "array" &&
      fieldOf(resolve(fieldOf(one, "items"), walk.components), "type") ===
        "string"
  )
  if (!isSingle && list === undefined) {
    return null
  }
  const max =
    list === undefined ? 1 : (numberOf(fieldOf(list, "maxItems")) ?? 4)
  const min =
    list === undefined ? 1 : (numberOf(fieldOf(list, "minItems")) ?? 1)
  return { ...mediaAt(spot.path, spot.path, min, max), required: spot.required }
}

function itemOf(schema: Schema, components: Schema): Schema | null {
  if (fieldOf(schema, "type") !== "array") {
    return null
  }
  const item = resolve(fieldOf(schema, "items"), components)
  return Object.keys(propertiesOf(item, components).properties).length > 0
    ? item
    : null
}

function hasParts(schema: Schema): boolean {
  return arrayOf(fieldOf(schema, "allOf")) !== null
}

function variantsOf(schema: Schema): unknown[] {
  return [
    ...(arrayOf(fieldOf(schema, "anyOf")) ?? []),
    ...(arrayOf(fieldOf(schema, "oneOf")) ?? []),
  ]
}

function typeOf(schema: Schema, components: Schema): string | null {
  const type = fieldOf(schema, "type")
  if (typeof type === "string") {
    return type
  }
  const types = variantsOf(schema)
    .map((one) => fieldOf(resolve(one, components), "type"))
    .filter((one): one is string => typeof one === "string" && one !== "null")
  if (types.includes("string")) {
    return "string"
  }
  return types.length === 1 ? (types[0] ?? null) : null
}

function isInternal(key: string, schema: Schema): boolean {
  const note = stringOf(fieldOf(schema, "description")) ?? ""
  return (
    internalKeys.includes(key) ||
    fieldOf(schema, "deprecated") === true ||
    internalNote.test(note)
  )
}
