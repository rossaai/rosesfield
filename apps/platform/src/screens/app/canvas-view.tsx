import { type ViewLayout, ViewMenu } from "@rosesfield/ui/components/view-menu"
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"

export type CanvasView = {
  layout: ViewLayout
  columns: number
  gridSize: number
}

type CanvasViewControl = CanvasView & {
  size: number
  setLayout: (layout: ViewLayout) => void
  setSize: (size: number) => void
}

export const runSizes = {
  min: 1,
  max: 4,
  initial: 3,
} as const

export function runColumnsOf(size: number, isRegular: boolean): number {
  if (!isRegular) {
    return 1
  }
  const kept = Math.min(Math.max(size, runSizes.min), runSizes.max)
  return runSizes.max + runSizes.min - kept
}

export function gridSizeOf(size: number): number {
  return size - runSizes.min
}

const listView: CanvasView = {
  layout: "list",
  columns: runColumnsOf(runSizes.initial, true),
  gridSize: gridSizeOf(runSizes.initial),
}

const CanvasViewContext = createContext<CanvasView>(listView)

export function useCanvasView(): CanvasView {
  return useContext(CanvasViewContext)
}

export function useCanvasViewControl(): CanvasViewControl {
  const [layout, setLayout] = useState<ViewLayout>("list")
  const [size, setSize] = useState<number>(runSizes.initial)
  const isRegular = useIsRegularWindow()
  return {
    layout,
    size,
    columns: runColumnsOf(size, isRegular),
    gridSize: gridSizeOf(size),
    setLayout,
    setSize,
  }
}

export function CanvasViewMenu({
  control,
}: {
  control: CanvasViewControl
}): ReactElement {
  const isRegular = useIsRegularWindow()
  return (
    <ViewMenu
      label={t("app.canvas.view")}
      layoutLabel={t("library.view.label")}
      listLabel={t("library.view.list")}
      gridLabel={t("library.view.grid")}
      layout={control.layout}
      onLayoutChange={control.setLayout}
      {...(isRegular
        ? {
            size: {
              label: t("library.view.size"),
              value: control.size,
              min: runSizes.min,
              max: runSizes.max,
              onValueChange: control.setSize,
            },
          }
        : {})}
    />
  )
}

export function CanvasViewProvider({
  control,
  children,
}: {
  control: CanvasViewControl
  children: ReactNode
}): ReactElement {
  const { layout, columns, gridSize } = control
  const view = useMemo(
    () => ({ layout, columns, gridSize }),
    [layout, columns, gridSize]
  )
  return (
    <CanvasViewContext.Provider value={view}>
      {children}
    </CanvasViewContext.Provider>
  )
}
