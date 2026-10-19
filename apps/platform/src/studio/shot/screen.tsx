import { type ReactElement, useRef } from "react"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { ShotPanel } from "@/studio/shot/shot-panel"
import { useShotScreen } from "@/studio/shot/use-shot-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetOpen = useRef<(open: boolean) => void>(() => undefined)
  const isRegular = useIsRegularWindow()
  const state = useShotScreen(app, seeds, {
    onStarted: () => sheetOpen.current(false),
    onRefused: () => {
      if (!isRegular) {
        sheetOpen.current(true)
      }
    },
  })
  const sheet = useSheetOpen(state.hasRuns)
  sheetOpen.current = sheet[1]
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<ShotPanel app={app} state={state} />}
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
