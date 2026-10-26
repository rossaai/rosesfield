import { type ReactElement, useRef } from "react"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { ColumnFrame, useSheetOpen } from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { LayersCanvasArea } from "@/studio/layers/layers-canvas-area"
import { LayersPanel } from "@/studio/layers/layers-panel"
import { LayersTabs } from "@/studio/layers/layers-tabs"
import { useLayersScreen } from "@/studio/layers/use-layers-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useLayersScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen()
  const isRegular = useIsRegularWindow()
  sheetClose.current = () => sheet[1](false)
  const addImage = (): void => {
    state.form.setInput("mode", "split")
    if (isRegular) {
      state.focusSource.current()
      return
    }
    sheet[1](true)
  }
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      tabs={<LayersTabs state={state} />}
      panel={<LayersPanel state={state} />}
      canvas={() => <LayersCanvasArea state={state} onAdd={addImage} />}
    />
  )
}
