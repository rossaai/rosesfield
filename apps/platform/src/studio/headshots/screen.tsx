import { type ReactElement, useEffect, useRef } from "react"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { HeadshotsPanel } from "@/studio/headshots/headshots-panel"
import { useHeadshotsScreen } from "@/studio/headshots/use-headshots-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const sheetOpen = useRef<() => void>(() => undefined)
  const state = useHeadshotsScreen(
    app,
    seeds,
    () => sheetClose.current(),
    () => sheetOpen.current()
  )
  const sheet = useSheetOpen(state.hasRuns)
  const setSheetOpen = sheet[1]
  const isRegular = useIsRegularWindow()
  sheetClose.current = () => setSheetOpen(false)
  sheetOpen.current = () => {
    if (!isRegular) {
      setSheetOpen(true)
    }
  }
  const { photoMessage } = state
  useEffect(() => {
    if (photoMessage !== null && !isRegular) {
      setSheetOpen(true)
    }
  }, [photoMessage, isRegular, setSheetOpen])
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<HeadshotsPanel state={state} />}
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
