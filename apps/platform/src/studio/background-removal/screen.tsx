import { type ReactElement, useRef } from "react"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { BackgroundRemovalPanel } from "@/studio/background-removal/background-removal-panel"
import { useBackgroundRemovalScreen } from "@/studio/background-removal/use-background-removal-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useBackgroundRemovalScreen(app, seeds, () =>
    sheetClose.current()
  )
  const sheet = useSheetOpen(state.hasRuns)
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<BackgroundRemovalPanel state={state} />}
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
