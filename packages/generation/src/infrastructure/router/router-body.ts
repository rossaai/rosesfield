import type { InputValue, RunInputs } from "@rosesfield/contract"
import { RunFailedError } from "#domain/error/run-failed.error"
import type { EngineFile } from "#domain/generation-engine.port"
import type { ModelField, ModelForm } from "#domain/model-form"
import { isObject } from "#infrastructure/router/router-json"

type Slot = Record<string, unknown>

type Placed = string | number | boolean | Slot

export function bodyOf(
  form: ModelForm,
  inputs: RunInputs,
  files: readonly EngineFile[]
): Slot {
  const body: Slot = {}
  const fixed = form.fields.filter(isNestedFixed)
  for (const field of form.fields.filter((one) => !isNestedFixed(one))) {
    for (const value of valuesOf(field, inputs[field.name], files)) {
      place(body, field.path.split("."), value)
    }
  }
  for (const field of fixed) {
    const segments = field.path.split(".")
    if (field.required || holds(body, segments.slice(0, -1))) {
      for (const value of valuesOf(field, inputs[field.name], files)) {
        place(body, segments, value)
      }
    }
  }
  return body
}

function isNestedFixed(field: ModelField): boolean {
  return (
    field.kind === "choice" &&
    field.options.length === 1 &&
    field.path.includes(".") &&
    !field.path.includes("[]") &&
    !field.path.includes("{")
  )
}

function holds(body: Slot, segments: readonly string[]): boolean {
  let current: unknown = body
  for (const segment of segments.filter((one) => one !== "0")) {
    const held = isObject(current) ? current[segment] : undefined
    current = Array.isArray(held) ? held[0] : held
  }
  return isObject(current)
}

function valuesOf(
  field: ModelField,
  value: InputValue | undefined,
  files: readonly EngineFile[]
): Placed[] {
  if (field.kind === "choice" && field.options.length === 1) {
    const only = field.options[0]
    return only === undefined ? [] : [only]
  }
  if (value === undefined) {
    return []
  }
  switch (field.kind) {
    case "prompt":
    case "text":
      return typeof value === "string" ? [value] : []
    case "number":
      return typeof value === "number" ? [value] : []
    case "toggle":
      return [value === "on"]
    case "choice": {
      const option = field.options.find((one) => String(one) === String(value))
      return option === undefined ? [] : [option]
    }
    case "media":
      return mediaValuesOf(field, value, files)
  }
}

function mediaValuesOf(
  field: Extract<ModelField, { kind: "media" }>,
  value: InputValue,
  files: readonly EngineFile[]
): Placed[] {
  if (!Array.isArray(value)) {
    return []
  }
  const encoded = value.map((assetId) => {
    const file = files.find((one) => one.assetId === assetId)
    if (file === undefined) {
      throw new RunFailedError({ cause: `no file for ${assetId}` })
    }
    return encode(field.path, file)
  })
  const isEachItem = field.path.includes("[]")
  if (isEachItem || field.max === 1) {
    return isEachItem ? encoded : encoded.slice(0, 1)
  }
  return [{ list: encoded }]
}

function encode(path: string, file: EngineFile): Placed {
  const data = base64Of(file.bytes)
  if (path.endsWith("@inline")) {
    return { mimeType: file.mime, data }
  }
  return /base64/i.test(path.split(".").at(-1) ?? "")
    ? data
    : `data:${file.mime};base64,${data}`
}

function place(target: Slot, segments: readonly string[], value: Placed): void {
  let current: Slot = target
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? ""
    const next = segments[index + 1]
    if (segment.startsWith("{") && segment.endsWith("}")) {
      const [key, fixed] = segment.slice(1, -1).split("=")
      current[key ?? ""] = fixed ?? ""
      continue
    }
    if (next === undefined || next === "@inline") {
      current[segment] = isList(value) ? value.list : value
      return
    }
    if (next === "[]" && index + 2 === segments.length) {
      const held = current[segment]
      current[segment] = [...(Array.isArray(held) ? held : []), value]
      return
    }
    current = enter(current, segment, next)
    if (next === "[]" || next === "0") {
      index += 1
    }
  }
}

function enter(current: Slot, segment: string, next: string): Slot {
  if (next !== "[]" && next !== "0") {
    const held = current[segment]
    const object = isObject(held) ? held : {}
    current[segment] = object
    return object
  }
  const held = current[segment]
  const list: unknown[] = Array.isArray(held) ? held : []
  current[segment] = list
  if (next === "0" && isObject(list[0])) {
    return list[0]
  }
  const item: Slot = {}
  if (next === "0") {
    list[0] = item
  } else {
    list.push(item)
  }
  return item
}

function isList(value: Placed): value is { list: Placed[] } {
  return isObject(value) && Array.isArray(value.list)
}

function base64Of(bytes: Uint8Array): string {
  let binary = ""
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000))
  }
  return btoa(binary)
}
