import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { inputValueText } from "@/pieces/run/run-facts"
import {
  type ExploreEntry,
  entryModel,
  type VisualEntry,
} from "@/screens/explore/explore-tile"

export type PresetEntry = { key: string; name: string; entry: VisualEntry }

export type ExploreRow =
  | {
      kind: "model"
      key: string
      model: string
      appId: string
      entries: VisualEntry[]
    }
  | { kind: "app"; key: string; app: AppListing; entries: VisualEntry[] }
  | { kind: "presets"; key: string; app: AppListing; presets: PresetEntry[] }

export type PromoEntry = { app: AppListing; entry: VisualEntry }

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

export const rowFloor = 3
export const rowLimit = 3
export const promoLimit = 5
export const promoFloor = 3

const promoShape = 16 / 9

const presetInputNames: readonly string[] = ["effect", "cameraMove"]
const autoValue = "auto"

export function isVisualEntry(entry: ExploreEntry): entry is VisualEntry {
  return entry.kind !== "audio" && entry.aspect !== undefined
}

export function visualEntries(entries: readonly ExploreEntry[]): VisualEntry[] {
  return entries.filter(isVisualEntry)
}

function groupBy<Item>(
  items: readonly Item[],
  keyOf: (item: Item) => string | null
): Map<string, Item[]> {
  const groups = new Map<string, Item[]>()
  for (const item of items) {
    const key = keyOf(item)
    if (key !== null) {
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
  }
  return groups
}

function largest<Item>(
  groups: Map<string, Item[]>,
  floor: number,
  limit: number
): Array<[string, Item[]]> {
  return [...groups.entries()]
    .filter(([, items]) => items.length >= floor)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, limit)
}

function appIdOf(entry: VisualEntry): string {
  return entry.run.appId
}

function mostUsedApp(entries: readonly VisualEntry[]): string {
  const [first] = largest(groupBy(entries, appIdOf), 1, 1)
  return first?.[0] ?? entries[0]?.run.appId ?? ""
}

export function modelRows(entries: readonly VisualEntry[]): ExploreRow[] {
  return largest(groupBy(entries, entryModel), rowFloor, rowLimit).map(
    ([model, items]): ExploreRow => ({
      kind: "model",
      key: `model-${model}`,
      model,
      appId: mostUsedApp(items),
      entries: items,
    })
  )
}

export function presetInputOf(app: AppListing): ChoiceInput | null {
  return (
    app.inputs.find(
      (input): input is ChoiceInput =>
        input.type === "choice" && presetInputNames.includes(input.name)
    ) ?? null
  )
}

export function presetsOf(
  app: AppListing,
  entries: readonly VisualEntry[]
): PresetEntry[] {
  const input = presetInputOf(app)
  if (input === null) {
    return []
  }
  const presetValue = (entry: VisualEntry): string | null => {
    const value = entry.run.inputs[input.name]
    return entry.kind === "video" &&
      typeof value === "string" &&
      value !== autoValue
      ? value
      : null
  }
  return [...groupBy(entries, presetValue).entries()].flatMap(
    ([value, items]) => {
      const [entry] = items
      const name = inputValueText(app, input, value)
      return entry === undefined || name === null
        ? []
        : [{ key: `${app.id}-${value}`, name, entry }]
    }
  )
}

function appRowOf(app: AppListing, entries: VisualEntry[]): ExploreRow | null {
  const presets = presetsOf(app, entries)
  if (presets.length >= rowFloor) {
    return { kind: "presets", key: `presets-${app.id}`, app, presets }
  }
  return entries.length >= rowFloor
    ? { kind: "app", key: `app-${app.id}`, app, entries }
    : null
}

export function appRows(entries: readonly VisualEntry[]): ExploreRow[] {
  return [...groupBy(entries, appIdOf).entries()]
    .flatMap(([appId, items]) => {
      const app = findCatalogApp(appId)
      const row = app === null ? null : appRowOf(app, items)
      return row === null ? [] : [{ row, size: items.length }]
    })
    .sort((a, b) => b.size - a.size)
    .slice(0, rowLimit)
    .map(({ row }) => row)
}

export function exploreRows(entries: readonly VisualEntry[]): ExploreRow[] {
  return [...modelRows(entries), ...appRows(entries)]
}

function promoGap(entry: VisualEntry): number {
  const { width, height } = entry.aspect
  return Math.abs(Math.log(width / height / promoShape))
}

function promoPick(items: readonly VisualEntry[]): VisualEntry | undefined {
  return items.reduce<VisualEntry | undefined>(
    (best, entry) =>
      best === undefined || promoGap(entry) < promoGap(best) ? entry : best,
    undefined
  )
}

export function promoEntries(entries: readonly VisualEntry[]): PromoEntry[] {
  const promos = [...groupBy(entries, appIdOf).entries()]
    .flatMap(([appId, items]) => {
      const app = findCatalogApp(appId)
      const entry = promoPick(items)
      return app === null || entry === undefined ? [] : [{ app, entry }]
    })
    .slice(0, promoLimit)
  return promos.length < promoFloor ? [] : promos
}
