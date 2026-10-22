import type { ModelField } from "#domain/model-form"
import { promptKeys } from "#infrastructure/router/router-field-leaf"
import { isInternal } from "#infrastructure/router/router-fields"
import {
  arrayOf,
  fieldOf,
  isObject,
  type Schema,
} from "#infrastructure/router/router-json"
import {
  propertiesOf,
  resolve,
  stringsOf,
} from "#infrastructure/router/router-schema"

type Pinned = string | number

type Alternative = { keys: string[]; pins: [string, Pinned][] }

export type Plan = { paths: string[]; pins: [string, Pinned][] }

export type Reading = {
  fields: readonly ModelField[]
  toward: string | null
  isEntered: (at: string) => boolean
}

const maxDepth = 6

const none: Plan = { paths: [], pins: [] }

function joined(prefix: string, key: string): string {
  return prefix === "" ? key : `${prefix}.${key}`
}

function isToward(reading: Reading, at: string): boolean {
  const { toward } = reading
  return toward !== null && (toward === at || toward.startsWith(`${at}.`))
}

export function coveredOf(field: ModelField): string[] {
  const shown: string[] = []
  const fixed: string[] = []
  for (const segment of field.path.split(".")) {
    const pinned = /^\{(.+)=.*\}$/.exec(segment)
    if (pinned !== null) {
      fixed.push([...shown, pinned[1]].join("."))
    } else if (segment !== "@inline") {
      shown.push(segment === "0" ? "[]" : segment)
    }
  }
  return [...fixed, shown.join(".")]
}

export function covers(field: ModelField, at: string): boolean {
  return coveredOf(field).some((one) => one === at || one.startsWith(`${at}.`))
}

export function isHeld(reading: Reading, at: string): boolean {
  return reading.fields.some((field) => covers(field, at))
}

export function reachesInto(
  fields: readonly ModelField[],
  at: string
): boolean {
  return fields.some((field) =>
    coveredOf(field).some((one) => one.startsWith(`${at}.`))
  )
}

function pinsOf(schema: Schema, components: Schema): [string, Pinned][] {
  const properties = fieldOf(schema, "properties")
  return Object.entries(isObject(properties) ? properties : {}).flatMap(
    ([key, raw]): [string, Pinned][] => {
      const listed = arrayOf(fieldOf(resolve(raw, components), "enum")) ?? []
      const [only] = listed
      return listed.length === 1 &&
        (typeof only === "string" || typeof only === "number")
        ? [[key, only]]
        : []
    }
  )
}

function groupsOf(schema: Schema, components: Schema): Alternative[][] {
  const variants = [
    ...(arrayOf(fieldOf(schema, "anyOf")) ?? []),
    ...(arrayOf(fieldOf(schema, "oneOf")) ?? []),
  ]
    .map((one) => resolve(one, components))
    .map((one) => ({
      keys: stringsOf(fieldOf(one, "required")),
      pins: pinsOf(one, components),
    }))
    .filter((one) => one.keys.length > 0)
  const negated = (arrayOf(fieldOf(fieldOf(schema, "not"), "allOf")) ?? [])
    .flatMap((one) => {
      const inner = fieldOf(one, "not")
      return (arrayOf(fieldOf(inner, "allOf")) ?? [inner]).flatMap((part) =>
        stringsOf(fieldOf(part, "required"))
      )
    })
    .map((key) => ({ keys: [key], pins: [] }))
  const keys = Object.keys(propertiesOf(schema, components).properties)
  const promptFirst = [
    ...keys.filter((key) => promptKeys.includes(key)),
    ...keys.filter((key) => !promptKeys.includes(key)),
  ]
  const anyKey =
    fieldOf(schema, "minProperties") === undefined
      ? []
      : promptFirst.slice(0, 1).map((key) => ({ keys: [key], pins: [] }))
  return [variants, negated, anyKey].filter((group) => group.length > 0)
}

function chosenOf(
  group: readonly Alternative[],
  reading: Reading,
  prefix: string
): Alternative | undefined {
  return (
    group.find((one) =>
      one.keys.some((key) => isToward(reading, joined(prefix, key)))
    ) ??
    group.find((one) =>
      one.keys.every((key) => isHeld(reading, joined(prefix, key)))
    ) ??
    group[0]
  )
}

export function planOf(
  schema: Schema,
  components: Schema,
  reading: Reading,
  prefix: string,
  depth: number
): Plan {
  const resolved = resolve(schema, components)
  const item = resolve(fieldOf(resolved, "items"), components)
  if (
    fieldOf(resolved, "type") === "array" &&
    hasProperties(item, components)
  ) {
    return planOf(item, components, reading, `${prefix}.[]`, depth + 1)
  }
  if (!hasProperties(resolved, components) || depth > maxDepth) {
    return { paths: prefix === "" ? [] : [prefix], pins: [] }
  }
  const { properties, required } = propertiesOf(resolved, components)
  const chosen = groupsOf(resolved, components).flatMap(
    (group) => chosenOf(group, reading, prefix) ?? []
  )
  const keys = [...new Set([...required, ...chosen.flatMap((one) => one.keys)])]
  const pins = chosen.flatMap((one) =>
    one.pins.map(([key, value]): [string, Pinned] => [
      joined(prefix, key),
      value,
    ])
  )
  const below = Object.keys(properties)
    .filter((key) => !isInternal(key, resolve(properties[key], components)))
    .map((key) => {
      const at = joined(prefix, key)
      const isNeeded = keys.includes(key)
      if (!(isNeeded || isToward(reading, at) || reading.isEntered(at))) {
        return none
      }
      const inner = planOf(
        resolve(properties[key], components),
        components,
        reading,
        at,
        depth + 1
      )
      if (isNeeded) {
        return inner.paths.length === 0 ? { ...inner, paths: [at] } : inner
      }
      return { ...inner, paths: inner.paths.filter((one) => one !== at) }
    })
  return {
    paths: below.flatMap((one) => one.paths),
    pins: [...pins, ...below.flatMap((one) => one.pins)],
  }
}

function hasProperties(schema: Schema, components: Schema): boolean {
  return Object.keys(propertiesOf(schema, components).properties).length > 0
}
