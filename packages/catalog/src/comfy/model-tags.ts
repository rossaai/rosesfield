import type { HostedModel, ModelField } from "@rosesfield/generation"
import type { ModelTag } from "#comfy/model-catalog.contract"

const resolutionNames = /^(resolution|output_resolution|size|quality)$/

const lengthNames =
  /^(duration|duration_seconds|durationseconds|seconds|length)$/i

export function hostedTagsOf(model: HostedModel): ModelTag[] {
  const fields = model.form?.fields ?? []
  const tags: ModelTag[] = [{ kind: "hosted" }]
  if (model.makes.includes("video")) {
    const resolution = topResolutionOf(fields)
    const length = lengthOf(fields)
    if (resolution !== null) {
      tags.push({ kind: "resolution", value: resolution })
    }
    if (length !== null) {
      tags.push({ kind: "length", ...length })
    }
    if (model.makes.includes("audio") || hasSoundToggle(fields)) {
      tags.push({ kind: "sound" })
    }
  }
  const references = fields.find(
    (field) => field.kind === "media" && field.media === "image"
  )
  if (references?.kind === "media" && references.max > 1) {
    tags.push({ kind: "references", max: references.max })
  }
  return tags
}

export function topResolutionOf(fields: readonly ModelField[]): string | null {
  const field = fields.find(
    (one) => one.kind === "choice" && resolutionNames.test(lastOf(one.path))
  )
  if (field?.kind !== "choice") {
    return null
  }
  const heights = field.options.flatMap((option) => {
    const height = heightOf(String(option))
    return height === null ? [] : [height]
  })
  if (heights.length === 0) {
    return null
  }
  const top = Math.max(...heights)
  return top >= 2160 ? "4K" : `${top}p`
}

export function lengthOf(
  fields: readonly ModelField[]
): { min: number; max: number } | null {
  const field = fields.find((one) => lengthNames.test(lastOf(one.path)))
  if (field?.kind === "number" && field.min !== null && field.max !== null) {
    return { min: field.min, max: field.max }
  }
  if (field?.kind === "choice") {
    const values = field.options
      .map((option) => Number.parseFloat(String(option)))
      .filter(Number.isFinite)
    return values.length === 0
      ? null
      : { min: Math.min(...values), max: Math.max(...values) }
  }
  return null
}

function hasSoundToggle(fields: readonly ModelField[]): boolean {
  return fields.some(
    (field) =>
      field.kind === "toggle" && /audio|sound/i.test(lastOf(field.path))
  )
}

function heightOf(value: string): number | null {
  const lower = value.toLowerCase()
  if (lower === "4k") {
    return 2160
  }
  if (lower === "2k") {
    return 1440
  }
  const named = /^(\d{3,4})p$/.exec(lower)
  if (named !== null) {
    return Number(named[1])
  }
  const sized = /^(\d{3,4})[x*](\d{3,4})$/.exec(lower)
  return sized === null ? null : Math.min(Number(sized[1]), Number(sized[2]))
}

function lastOf(path: string): string {
  return path.split(".").at(-1) ?? path
}
