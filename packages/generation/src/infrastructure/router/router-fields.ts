import { type FieldRole, fieldRoleOf } from "#domain/field-role"
import type { ModelField } from "#domain/model-form"
import {
  namedOptions,
  optionNamed,
  optionsOf,
} from "#infrastructure/router/router-choices"
import {
  depthOf,
  mediaAt,
  mediaKindOf,
  promptAt,
  promptKeys,
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
} from "#infrastructure/router/router-schema"

type Walk = {
  components: Schema
  fields: ModelField[]
}

type Spot = {
  path: string
  key: string
  required: boolean
  isInOptional: boolean
}

type ImageRole = {
  value: string
  name: string
  max: number
}

const maxDepth = 4

const settingRoles: readonly FieldRole[] = [
  "aspect",
  "resolution",
  "quality",
  "length",
]

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

const imageRoles: readonly ImageRole[] = [
  { value: "first_frame", name: "firstFrame", max: 1 },
  { value: "last_frame", name: "lastFrame", max: 1 },
  { value: "reference_image", name: "references", max: 4 },
]

export function fieldsOf(facts: SchemaFacts): ModelField[] {
  if (facts.request === null) {
    return []
  }
  const walk: Walk = { components: facts.components, fields: [] }
  walkObject(walk, facts.request, "", 0, true, false)
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
  isRequired: boolean,
  isInOptional: boolean
): void {
  const { properties, required } = propertiesOf(schema, walk.components)
  for (const [key, raw] of Object.entries(properties)) {
    const spot: Spot = {
      path: `${prefix}${key}`,
      key,
      required: isRequired && required.includes(key),
      isInOptional,
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
    walkObject(
      walk,
      schema,
      `${spot.path}.`,
      depth + 1,
      spot.required,
      spot.isInOptional || !spot.required
    )
    return
  }
  const item = itemOf(schema, walk.components)
  if (item !== null) {
    walkList(walk, item, spot, depth)
  }
}

function walkList(walk: Walk, item: Schema, spot: Spot, depth: number): void {
  const { properties } = propertiesOf(item, walk.components)
  const roles = textOptionsOf(resolve(properties.role, walk.components))
  if (roles.includes("user")) {
    walkMessage(walk, properties, spot, depth)
    return
  }
  const tags = textOptionsOf(resolve(properties.type, walk.components))
  if (tags.length > 0 && tags.some((tag) => tag in properties)) {
    walkTagged(walk, properties, tags, { ...spot, roles })
    return
  }
  if ("text" in properties) {
    walkParts(walk, properties, spot)
    return
  }
  walkObject(
    walk,
    item,
    `${spot.path}.0.`,
    depth + 1,
    spot.required,
    spot.isInOptional || !spot.required
  )
}

function textOptionsOf(schema: Schema): string[] {
  return optionsOf(schema).filter(
    (one): one is string => typeof one === "string"
  )
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
  spot: Spot & { roles: readonly string[] }
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
      walk.fields.push(...taggedMedia(spot, tag))
    }
  }
}

function taggedMedia(
  spot: Spot & { roles: readonly string[] },
  tag: string
): ModelField[] {
  const item = `${spot.path}.[].{type=${tag}}`
  const roles = imageRoles.filter((role) => spot.roles.includes(role.value))
  if (mediaKindOf(tag) !== "image" || roles.length === 0) {
    return [mediaAt(`${item}.${tag}.url`, tag, 1, 4)]
  }
  return roles.map((role) => ({
    ...mediaAt(`${item}.{role=${role.value}}.${tag}.url`, tag, 1, role.max),
    name: role.name,
  }))
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
  const field =
    choiceOf(walk, schema, spot, false) ??
    mediaOf(walk, schema, spot) ??
    choiceOf(walk, schema, spot, true) ??
    namedChoiceOf(walk, schema, spot) ??
    scalarOf(
      base,
      withVariantBounds(schema, walk.components),
      typeOf(schema, walk.components),
      spot.key
    )
  return field !== null && spot.isInOptional ? withoutDefault(field) : field
}

function choiceOf(
  walk: Walk,
  schema: Schema,
  spot: Spot,
  isListed: boolean
): ModelField | null {
  if (isListed !== (arrayOf(fieldOf(schema, "enum")) === null)) {
    return null
  }
  if (isListed && typeOf(schema, walk.components) !== "string") {
    return null
  }
  const options = optionsOf(isListed ? { ...schema, type: "string" } : schema)
  if (options.length === 0 || (isListed && promptKeys.includes(spot.key))) {
    return null
  }
  const fallback = fieldOf(schema, "default")
  const named = optionNamed(options, fallback)
  if (isListed && fallback !== undefined && named === null) {
    return null
  }
  return {
    name: spot.key,
    path: spot.path,
    required: spot.required,
    kind: "choice",
    options,
    default: named,
  }
}

function namedChoiceOf(
  walk: Walk,
  schema: Schema,
  spot: Spot
): ModelField | null {
  if (
    typeOf(schema, walk.components) !== "string" ||
    promptKeys.includes(spot.key)
  ) {
    return null
  }
  const options = namedOptions(schema)
  const field: ModelField = {
    name: spot.key,
    path: spot.path,
    required: spot.required,
    kind: "choice",
    options,
    default: optionNamed(options, fieldOf(schema, "default")),
  }
  const role = fieldRoleOf(field, "image")
  return options.length < 2 || role === null || !settingRoles.includes(role)
    ? null
    : field
}

function withVariantBounds(schema: Schema, components: Schema): Schema {
  if (
    fieldOf(schema, "minimum") !== undefined ||
    fieldOf(schema, "maximum") !== undefined
  ) {
    return schema
  }
  const bounded = variantsOf(schema)
    .map((one) => resolve(one, components))
    .find(
      (one) =>
        numberOf(fieldOf(one, "minimum")) !== null &&
        numberOf(fieldOf(one, "maximum")) !== null
    )
  return bounded === undefined
    ? schema
    : {
        ...schema,
        minimum: fieldOf(bounded, "minimum"),
        maximum: fieldOf(bounded, "maximum"),
      }
}

function withoutDefault(field: ModelField): ModelField {
  return field.kind === "media" ? field : { ...field, default: null }
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
