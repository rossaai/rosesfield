import type { MediaKind, ModelField } from "#domain/model-form"
import {
  fieldOf,
  numberOf,
  type Schema,
  stringOf,
} from "#infrastructure/router/router-json"

const promptKeys: readonly string[] = [
  "prompt",
  "promptText",
  "prompt_text",
  "text_prompt",
  "text",
  "instruction",
  "input",
]

export function scalarOf(
  base: { name: string; path: string; required: boolean },
  schema: Schema,
  type: string | null,
  key: string
): ModelField | null {
  const fallback = fieldOf(schema, "default")
  switch (type) {
    case "string":
      return {
        ...base,
        kind: promptKeys.includes(key) ? "prompt" : "text",
        maxLength: numberOf(fieldOf(schema, "maxLength")),
        default: stringOf(fallback),
      }
    case "integer":
    case "number":
      return {
        ...base,
        kind: "number",
        min: numberOf(fieldOf(schema, "minimum")),
        max: numberOf(fieldOf(schema, "maximum")),
        integer: type === "integer",
        default: numberOf(fallback),
      }
    case "boolean":
      return {
        ...base,
        kind: "toggle",
        default: typeof fallback === "boolean" ? fallback : null,
      }
    default:
      return null
  }
}

export function promptAt(path: string, required: boolean): ModelField {
  return {
    name: "prompt",
    path,
    required,
    kind: "prompt",
    maxLength: null,
    default: null,
  }
}

export function mediaAt(
  path: string,
  hint: string,
  min: number,
  max: number
): ModelField {
  const media = mediaKindOf(hint)
  return {
    name: media === "image" ? "images" : media,
    path,
    required: false,
    kind: "media",
    media,
    min,
    max: Math.max(1, Math.min(16, max)),
  }
}

export function mediaKindOf(hint: string): MediaKind {
  if (/video/i.test(hint)) {
    return "video"
  }
  return /audio|sound/i.test(hint) ? "audio" : "image"
}

export function withFreeName(field: ModelField, seen: Set<string>): ModelField {
  const short = camelOf(field.name)
  const segments = field.path
    .split(".")
    .filter((one) => /^[A-Za-z_]+[A-Za-z0-9_]*$/.test(one))
  const long =
    camelOf(segments.join(" ")) ?? camelOf(segments.slice(-2).join(" "))
  const name = short !== null && !seen.has(short) ? short : long
  const free = name === null || seen.has(name) ? `field${seen.size}` : name
  seen.add(free)
  return { ...field, name: free }
}

export function camelOf(text: string): string | null {
  const words = text
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word !== "" && word !== "0")
  const joined = words
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("")
  return /^[a-z][a-zA-Z0-9]{0,39}$/.test(joined) ? joined : null
}

export function depthOf(field: ModelField): number {
  return field.path.split(".").length
}

export function rankOf(field: ModelField): number {
  const order: Record<ModelField["kind"], number> = {
    prompt: 0,
    media: 1,
    choice: 2,
    number: 3,
    toggle: 4,
    text: 5,
  }
  return order[field.kind]
}
