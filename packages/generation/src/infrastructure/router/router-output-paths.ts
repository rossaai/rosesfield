import {
  arrayOf,
  fieldOf,
  isObject,
  type Schema,
  stringOf,
} from "#infrastructure/router/router-json"
import { resolve } from "#infrastructure/router/router-schema"

export type OutputLeaf = "url" | "base64"

export type OutputPath = {
  segments: readonly string[]
  leaf: OutputLeaf
}

const echoed =
  /^(request|input|inputs|options|optionsoverride|webhook|errors?|task_error|billing|usage|usagemetadata|tools|tool_choice|citations|citationmetadata|promptfeedback|safetyratings|reasoning|metadata)$/i

const control =
  /(callback|cancel|status|webhook|poll|watermark|progress|thumbnail|preview|bounding_boxes|response_url|^get$)/i

const urlName =
  /(url|uri|^sample$|^image$|^video$|^audio$|^generated$|^outputs?$|^(fbx|glb|obj|usdz|mtl|stl|blend)$)/i

const base64Name = /(b64|base64|bytes|^data$|^audio$)/i

const maxDepth = 10

export function outputPathsOf(
  response: Schema | null,
  components: Schema
): OutputPath[] {
  const found = new Map<string, OutputPath>()
  if (response !== null) {
    walk(response, components, [], 0, "", (path) => {
      found.set(`${path.leaf}:${path.segments.join(".")}`, path)
    })
  }
  return [...found.values()]
}

function walk(
  value: unknown,
  components: Schema,
  segments: readonly string[],
  depth: number,
  described: string,
  add: (path: OutputPath) => void
): void {
  if (depth > maxDepth) {
    return
  }
  const schema = resolve(value, components)
  const description = stringOf(fieldOf(schema, "description")) ?? described
  for (const variant of variantsOf(schema)) {
    walk(variant, components, segments, depth + 1, description, add)
  }
  const properties = fieldOf(schema, "properties")
  if (isObject(properties)) {
    for (const [name, child] of Object.entries(properties)) {
      if (!echoed.test(name)) {
        walk(child, components, [...segments, name], depth + 1, "", add)
      }
    }
    return
  }
  if (fieldOf(schema, "type") === "array" || "items" in schema) {
    const items = fieldOf(schema, "items")
    walk(items, components, [...segments, "[]"], depth + 1, description, add)
    return
  }
  if (isString(schema)) {
    addLeaf(schema, segments, description, add)
  }
}

function addLeaf(
  schema: Schema,
  segments: readonly string[],
  description: string,
  add: (path: OutputPath) => void
): void {
  const name = segments.filter((one) => one !== "[]").at(-1) ?? ""
  const format = stringOf(fieldOf(schema, "format"))
  if (control.test(name) || format === "date-time") {
    return
  }
  if (
    format === "uri" ||
    format === "url" ||
    urlName.test(name) ||
    /\bURL\b/.test(description)
  ) {
    add({ segments, leaf: "url" })
  }
  if (format === "byte" || base64Name.test(name)) {
    add({ segments, leaf: "base64" })
  }
}

function variantsOf(schema: Schema): unknown[] {
  return [
    ...(arrayOf(fieldOf(schema, "anyOf")) ?? []),
    ...(arrayOf(fieldOf(schema, "oneOf")) ?? []),
  ]
}

function isString(schema: Schema): boolean {
  const type = fieldOf(schema, "type")
  return type === "string" || (Array.isArray(type) && type.includes("string"))
}
