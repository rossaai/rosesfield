import type { Run } from "@rosesfield/contract"
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
} from "react"
import { isWorking } from "@/api/queries"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { runHoldsWords } from "@/pieces/view/match-words"
import { NoMatch } from "@/pieces/view/no-match"
import { runCardColumnsOf, tileSizes } from "@/pieces/view/tile-scale"
import { type PlaceView, viewStart } from "@/pieces/view/use-view"
import { historyGridItems } from "@/screens/history/history-grid-items"
import { ResultGrid } from "@/screens/library/result-grid"

export type CanvasView = Pick<
  PlaceView,
  "layout" | "size" | "words" | "setWords"
> & {
  columns: number
}

function runCardsAcross(size: number, isRegular: boolean): number {
  return isRegular ? runCardColumnsOf(size) : 1
}

const startView: CanvasView = {
  ...viewStart,
  words: "",
  setWords: () => undefined,
  columns: runCardsAcross(tileSizes.start, true),
}

const CanvasViewContext = createContext<CanvasView>(startView)

export function useCanvasView(): CanvasView {
  return useContext(CanvasViewContext)
}

export function CanvasViewProvider({
  view,
  children,
}: {
  view: PlaceView
  children: ReactNode
}): ReactElement {
  const isRegular = useIsRegularWindow()
  const { layout, size, words, setWords } = view
  const shown = useMemo(
    () => ({
      layout,
      size,
      words,
      setWords,
      columns: runCardsAcross(size, isRegular),
    }),
    [layout, size, words, setWords, isRegular]
  )
  return (
    <CanvasViewContext.Provider value={shown}>
      {children}
    </CanvasViewContext.Provider>
  )
}

export function MatchedRuns({
  runs,
  children,
}: {
  runs: readonly Run[]
  children: (runs: readonly Run[]) => ReactNode
}): ReactNode {
  const view = useCanvasView()
  const words = view.words.trim()
  const kept = runs.filter((run) => runHoldsWords(run, words))
  if (kept.length > 0) {
    return children(kept)
  }
  return <NoMatch onShowAll={() => view.setWords("")} />
}

export type RunCardsOf = (runs: readonly Run[], columns: number) => ReactNode

export function ViewedRuns({
  runs,
  cards,
}: {
  runs: readonly Run[]
  cards: RunCardsOf
}): ReactNode {
  const view = useCanvasView()
  if (view.layout === "list") {
    return cards(runs, view.columns)
  }
  const split = gridSplitOf(runs)
  return (
    <div data-slot="app-grid" className="flex flex-col gap-s2">
      {split.cards.length === 0 ? null : cards(split.cards, view.columns)}
      <ResultGrid items={historyGridItems(split.results)} size={view.size} />
    </div>
  )
}

export function RunsInView({
  runs,
  cards,
}: {
  runs: readonly Run[]
  cards: RunCardsOf
}): ReactNode {
  return (
    <MatchedRuns runs={runs}>
      {(kept) => <ViewedRuns runs={kept} cards={cards} />}
    </MatchedRuns>
  )
}

export type GridSplit = { cards: readonly Run[]; results: readonly Run[] }

export function gridSplitOf(runs: readonly Run[]): GridSplit {
  const firstResult = runs.findIndex(
    (run) => run.outputs.length > 0 && !isWorking(run)
  )
  const latest = firstResult === -1 ? runs.length : firstResult
  const cards = runs.filter(
    (run, index) =>
      isWorking(run) || (run.outputs.length === 0 && index < latest)
  )
  return { cards, results: runs.filter((run) => !cards.includes(run)) }
}
