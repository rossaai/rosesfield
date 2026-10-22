import { type ReactElement, useRef } from "react"
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
  const sheetClose = useRef<() => void>(() => undefined)
  const screen = useShotScreen(app, seeds, () => sheetClose.current())
  const { state } = screen
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<ShotPanel app={app} screen={screen} />}
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          onUseInputs={screen.fillFromRun}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
