import type { ModelPickerRow } from "@rosesfield/ui/components/model-row"

type ModelPickerSortBy = "rank" | "price"

type ModelPickerOrder = "down" | "up"

type ModelPickerSort = { by: ModelPickerSortBy; order: ModelPickerOrder }

type SearchedRow = { row: ModelPickerRow; text: string }

const modelPickerSortBys: readonly ModelPickerSortBy[] = ["rank", "price"]

const modelPickerOrders: readonly ModelPickerOrder[] = ["down", "up"]

const firstSort: ModelPickerSort = { by: "rank", order: "down" }

const recentLimit = 3

function isModelPickerSortBy(value: string): value is ModelPickerSortBy {
  return modelPickerSortBys.some((by) => by === value)
}

function isModelPickerOrder(value: string): value is ModelPickerOrder {
  return modelPickerOrders.some((order) => order === value)
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
  if (sort.by === "rank") {
    return sort.order === "down"
      ? [...rows]
      : firstThenRest(
          rows,
          (row) => row.rank !== undefined,
          (ranked) => ranked.reverse()
        )
  }
  const sign = sort.order === "up" ? 1 : -1
  return firstThenRest(
    rows,
    (row) => row.price !== undefined,
    (priced) => priced.sort((a, b) => sign * (creditsOf(a) - creditsOf(b)))
  )
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

export type {
  ModelPickerOrder,
  ModelPickerSort,
  ModelPickerSortBy,
  SearchedRow,
}
export {
  firstSort,
  hasOpenWeights,
  isMatch,
  isModelPickerOrder,
  isModelPickerSortBy,
  isOpenRow,
  modelPickerOrders,
  modelPickerSortBys,
  needleOf,
  recentLimit,
  recentRowsOf,
  searchedRowsOf,
  sortedRows,
}
