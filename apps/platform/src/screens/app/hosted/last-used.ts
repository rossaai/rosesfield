import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { FormValues } from "@/screens/app/app-form"

export type LastUsed = {
  model: string
  settings: Readonly<Record<string, string | number>>
  count?: number
  aspectRatio?: string | null
}

const storageKey = "rosesfield.app.last-used"

function isSettingField(field: ModelField): boolean {
  return (
    field.kind === "choice" ||
    field.kind === "number" ||
    field.kind === "toggle"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isLastUsed(value: unknown): value is LastUsed {
  return (
    isRecord(value) &&
    typeof value.model === "string" &&
    (value.count === undefined || typeof value.count === "number") &&
    (value.aspectRatio === undefined ||
      value.aspectRatio === null ||
      typeof value.aspectRatio === "string") &&
    isRecord(value.settings) &&
    Object.values(value.settings).every(
      (one) => typeof one === "string" || typeof one === "number"
    )
  )
}

function readAll(): Record<string, LastUsed> {
  try {
    const raw = window.localStorage.getItem(storageKey)
    const parsed: unknown = raw === null ? null : JSON.parse(raw)
    if (!isRecord(parsed)) {
      return {}
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, LastUsed] =>
        isLastUsed(entry[1])
      )
    )
  } catch {
    return {}
  }
}

/** Reads the model and the settings you last used in an app, kept in this browser. */
export function readLastUsed(appId: string): LastUsed | null {
  return readAll()[appId] ?? null
}

/** The values of a model's setting fields among the given values, never the prompt or the media. */
export function settingsOf(
  fields: readonly ModelField[],
  values: Readonly<Record<string, unknown>>
): Record<string, string | number> {
  return Object.fromEntries(
    fields.filter(isSettingField).flatMap((field) => {
      const value = values[field.name]
      return typeof value === "string" || typeof value === "number"
        ? [[field.name, value]]
        : []
    })
  )
}

/** The model a form holds and the values of its setting fields. */
export function lastUsedOf(model: CatalogModel, values: FormValues): LastUsed {
  const settings = settingsOf(model.form ?? [], values.inputs)
  return {
    model: model.id,
    settings,
    count: values.count,
    aspectRatio: values.aspectRatio,
  }
}

export function keepLastUsed(appId: string, used: LastUsed): void {
  const all = readAll()
  if (JSON.stringify(all[appId]) === JSON.stringify(used)) {
    return
  }
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ ...all, [appId]: used })
    )
  } catch {
    return
  }
}
