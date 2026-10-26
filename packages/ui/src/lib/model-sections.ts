import type { ModelPickerRow } from "@rosesfield/ui/components/model-row"

type ModelPickerSection = {
  id: string
  label: string
  rows: readonly ModelPickerRow[]
}

type ModelPickerOrder = "top" | "newest" | "price" | "lastUsed"

type ModelPickerWeights = "all" | "open"

type ModelPickerFilters = Record<ModelPickerOrder | "order" | "open", string>

type SearchedRow = { row: ModelPickerRow; text: string }

const modelPickerOrders: readonly ModelPickerOrder[] = [
  "top",
  "newest",
  "price",
  "lastUsed",
]

function rowsOf(sections: readonly ModelPickerSection[]): ModelPickerRow[] {
  const seen = new Set<string>()
  return sections.flatMap((section) =>
    section.rows.filter((row) => !seen.has(row.id) && seen.add(row.id) !== null)
  )
}

function firstThenRest(
  rows: readonly ModelPickerRow[],
  isFirst: (row: ModelPickerRow) => boolean,
  compare: (a: ModelPickerRow, b: ModelPickerRow) => number
): ModelPickerRow[] {
  const first = rows.filter(isFirst).sort(compare)
  return [...first, ...rows.filter((row) => !isFirst(row))]
}

function orderedRows(
  rows: readonly ModelPickerRow[],
  order: ModelPickerOrder,
  recent: readonly string[] = []
): ModelPickerRow[] {
  switch (order) {
    case "top":
      return [...rows]
    case "newest":
      return firstThenRest(
        rows,
        (row) => row.released !== undefined,
        (a, b) => (b.released ?? "").localeCompare(a.released ?? "")
      )
    case "price":
      return firstThenRest(
        rows,
        (row) => row.cost !== undefined,
        (a, b) => (a.cost ?? 0) - (b.cost ?? 0)
      )
    case "lastUsed": {
      const places = new Map(recent.map((id, index) => [id, index]))
      return firstThenRest(
        rows,
        (row) => places.has(row.id),
        (a, b) => (places.get(a.id) ?? 0) - (places.get(b.id) ?? 0)
      )
    }
  }
}

function hasOrder(
  rows: readonly ModelPickerRow[],
  order: ModelPickerOrder,
  recent: readonly string[] = [],
  isPricing = false
): boolean {
  switch (order) {
    case "top":
      return true
    case "newest":
      return rows.some((row) => row.released !== undefined)
    case "price":
      return isPricing || rows.some((row) => row.cost !== undefined)
    case "lastUsed":
      return rows.some((row) => recent.includes(row.id))
  }
}

function hasOpenWeights(rows: readonly ModelPickerRow[]): boolean {
  return rows.some((row) => row.isOpen === true)
}

function needleOf(query: string): string {
  return query.trim().toLowerCase()
}

function searchedRowsOf(rows: readonly ModelPickerRow[]): SearchedRow[] {
  return rows.map((row) => ({
    row,
    text: [row.name, row.maker, row.lab ?? ""].join("\n").toLowerCase(),
  }))
}

function isMatch(text: string, needle: string): boolean {
  return needle === "" || text.includes(needle)
}

export type {
  ModelPickerFilters,
  ModelPickerOrder,
  ModelPickerSection,
  ModelPickerWeights,
  SearchedRow,
}
export {
  hasOpenWeights,
  hasOrder,
  isMatch,
  modelPickerOrders,
  needleOf,
  orderedRows,
  rowsOf,
  searchedRowsOf,
}
