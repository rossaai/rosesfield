import { type ReactElement, useRef } from "react"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { AnglesCanvas } from "@/studio/angles/angles-canvas"
import { AnglesPanel } from "@/studio/angles/angles-panel"
import { useAnglesScreen } from "@/studio/angles/use-angles-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useAnglesScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen(state.hasRuns)
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<AnglesPanel state={state} />}
      canvas={(openInputs) => (
        <AnglesCanvas
          app={app}
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
