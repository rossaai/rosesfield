import { type FieldRole, fieldRoleOf } from "#domain/field-role"
import type { ModelField } from "#domain/model-form"
import {
  namedOptions,
  optionNamed,
} from "#infrastructure/router/router-choices"
import { promptKeys } from "#infrastructure/router/router-field-leaf"
import {
  arrayOf,
  fieldOf,
  numberOf,
  type Schema,
} from "#infrastructure/router/router-json"
import { resolve } from "#infrastructure/router/router-schema"

const settingRoles: readonly FieldRole[] = [
  "aspect",
  "resolution",
  "quality",
  "length",
]

export function variantsOf(schema: Schema): unknown[] {
  return [
    ...(arrayOf(fieldOf(schema, "anyOf")) ?? []),
    ...(arrayOf(fieldOf(schema, "oneOf")) ?? []),
  ]
}

export function typeOf(schema: Schema, components: Schema): string | null {
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

export function withVariantBounds(schema: Schema, components: Schema): Schema {
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

export function namedChoiceOf(
  schema: Schema,
  spot: { key: string; path: string; required: boolean },
  components: Schema
): ModelField | null {
  if (
    typeOf(schema, components) !== "string" ||
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
