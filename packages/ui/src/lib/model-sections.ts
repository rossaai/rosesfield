import type { ModelPickerRow } from "@rosesfield/ui/components/model-row"

type ModelPickerSort = "rankBest" | "rankLast" | "priceLow" | "priceHigh"

type SearchedRow = { row: ModelPickerRow; text: string }

const modelPickerSorts: readonly ModelPickerSort[] = [
  "rankBest",
  "rankLast",
  "priceLow",
  "priceHigh",
]

const recentLimit = 3

function isModelPickerSort(value: string): value is ModelPickerSort {
  return modelPickerSorts.some((sort) => sort === value)
}

function firstThenRest(
  rows: readonly ModelPickerRow[],
  isFirst: (row: ModelPickerRow) => boolean,
  order: (first: ModelPickerRow[]) => ModelPickerRow[]
): ModelPickerRow[] {
  return [
    ...order(rows.filter(isFirst)),
    ...rows.filter((row) => !isFirst(row)),
  ]
}

function creditsOf(row: ModelPickerRow): number {
  return row.price?.credits ?? 0
}

function sortedRows(
  rows: readonly ModelPickerRow[],
  sort: ModelPickerSort
): ModelPickerRow[] {
  switch (sort) {
    case "rankBest":
      return [...rows]
    case "rankLast":
      return firstThenRest(
        rows,
        (row) => row.rank !== undefined,
        (ranked) => ranked.reverse()
      )
    case "priceLow":
      return firstThenRest(
        rows,
        (row) => row.price !== undefined,
        (priced) => priced.sort((a, b) => creditsOf(a) - creditsOf(b))
      )
    case "priceHigh":
      return firstThenRest(
        rows,
        (row) => row.price !== undefined,
        (priced) => priced.sort((a, b) => creditsOf(b) - creditsOf(a))
      )
  }
}

function isOpenRow(row: ModelPickerRow): boolean {
  return row.badges.some((badge) => badge.kind === "openWeights")
}

function hasOpenWeights(rows: readonly ModelPickerRow[]): boolean {
  return rows.some(isOpenRow)
}

function recentRowsOf(
  rows: readonly ModelPickerRow[],
  recent: readonly string[]
): ModelPickerRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const seen = new Set<string>()
  return recent
    .flatMap((id) => {
      const row = byId.get(id)
      if (row === undefined || seen.has(id)) {
        return []
      }
      seen.add(id)
      return [row]
    })
    .slice(0, recentLimit)
}

function needleOf(query: string): string {
  return query.trim().toLowerCase()
}

function searchedRowsOf(rows: readonly ModelPickerRow[]): SearchedRow[] {
  return rows.map((row) => ({
    row,
    text: [row.name, ...row.keywords].join("\n").toLowerCase(),
  }))
}

function isMatch(text: string, needle: string): boolean {
  return needle === "" || text.includes(needle)
}

export type { ModelPickerSort, SearchedRow }
export {
  hasOpenWeights,
  isMatch,
  isModelPickerSort,
  isOpenRow,
  modelPickerSorts,
  needleOf,
  recentLimit,
  recentRowsOf,
  searchedRowsOf,
  sortedRows,
}
