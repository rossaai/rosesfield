import type { ModelPickerRow } from "@rosesfield/ui/components/model-row"

type ModelPickerSortBy = "rank" | "price"

type ModelPickerOrder = "down" | "up"

type ModelPickerSort = { by: ModelPickerSortBy; order: ModelPickerOrder }

type SearchedRow = { row: ModelPickerRow; text: string }

const modelPickerSortBys: readonly ModelPickerSortBy[] = ["rank", "price"]

const modelPickerOrders: readonly ModelPickerOrder[] = ["down", "up"]

const firstSort: ModelPickerSort = { by: "rank", order: "down" }

const wholeSlack = 1e-9

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

/** Rounds a price up to a whole credit and never under 1, the rule every price a person reads follows. */
function wholeCreditsOf(credits: number): number {
  return credits > 0 ? Math.max(1, Math.ceil(credits - wholeSlack)) : credits
}

function placeOf(row: ModelPickerRow): number {
  return row.rank?.place ?? Number.POSITIVE_INFINITY
}

/** The Best value rows, best ranked first: the Pareto line of rank against whole credits among the rows ranked in the top quarter of the ranked rows, each priced lower than every row ranked above it. */
function valueRowsOf(rows: readonly ModelPickerRow[]): ModelPickerRow[] {
  const ranked = rows
    .filter((row) => row.rank !== undefined)
    .sort((a, b) => placeOf(a) - placeOf(b))
  const line: ModelPickerRow[] = []
  let cheapest = Number.POSITIVE_INFINITY
  for (const row of ranked.slice(0, Math.ceil(ranked.length / 4))) {
    const whole =
      row.price === undefined ? null : wholeCreditsOf(row.price.credits)
    if (whole !== null && whole < cheapest) {
      line.push(row)
      cheapest = whole
    }
  }
  return line
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
  searchedRowsOf,
  sortedRows,
  valueRowsOf,
  wholeCreditsOf,
}
