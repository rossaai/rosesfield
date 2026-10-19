import { type ReactElement, useRef } from "react"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { ExpandPanel } from "@/studio/expand/expand-panel"
import { useExpandScreen } from "@/studio/expand/use-expand-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useExpandScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen(state.hasRuns)
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<ExpandPanel state={state} />}
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          order="newest-first"
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
