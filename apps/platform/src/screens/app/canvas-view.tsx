import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
} from "react"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { runHoldsWords } from "@/pieces/view/match-words"
import { runCardColumnsOf, tileSizes } from "@/pieces/view/tile-scale"
import { type PlaceView, viewStart } from "@/pieces/view/use-view"

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
  return (
    <StateView
      kind="empty"
      title={t("library.filterEmpty.title")}
      actions={
        <Button onClick={() => view.setWords("")}>
          {t("library.filterEmpty.action")}
        </Button>
      }
    />
  )
}
