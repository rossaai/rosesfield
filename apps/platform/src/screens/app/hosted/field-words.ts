import type { ModelField } from "@rosesfield/catalog/comfy"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { fieldPlaceOf, type NormalSetting } from "@/screens/app/setting-table"

const normalCaptions: Partial<Record<NormalSetting, CopyKey>> = {
  format: "field.aspect.label",
  resolution: "model.field.resolution",
  quality: "model.field.quality",
  length: "model.field.duration",
  count: "field.count.label",
}

const placeKeys: readonly string[] = [
  "url",
  "uri",
  "bytesBase64Encoded",
  "data",
]

const qualifierKeys: readonly string[] = [
  "weight",
  "images",
  "text",
  "value",
  "id",
  "mimeType",
]

const placeWords: readonly string[] = ["url", "uri"]

function wordsOf(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((one) => one !== "")
}

function keyWordsOf(segments: readonly string[], path: string): string[] {
  const last = segments.at(-1) ?? path
  const parent = segments.at(-2)
  if (parent === undefined) {
    return wordsOf(last)
  }
  if (placeKeys.includes(last)) {
    const words = wordsOf(parent)
    const kept = words.filter((one) => !placeWords.includes(one))
    return kept.length === 0 ? words : kept
  }
  return qualifierKeys.includes(last)
    ? [...wordsOf(parent), ...wordsOf(last)]
    : wordsOf(last)
}

export function wordsOfPath(path: string): string {
  const segments = path
    .split(".")
    .filter((one) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(one))
  const words = keyWordsOf(segments, path).join(" ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function fieldCaption(field: ModelField): string {
  const place = fieldPlaceOf(field)
  const normal =
    place.kind === "show" ? normalCaptions[place.setting] : undefined
  if (normal !== undefined) {
    return t(normal)
  }
  const key = `model.field.${field.name}`
  return hasCatalogText(key)
    ? tCatalog(key)
    : t("model.field.other", { name: wordsOfPath(field.path) })
}
