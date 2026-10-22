import { type ReactElement, useRef } from "react"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { ThreeDCanvas } from "@/studio/three-d/three-d-canvas"
import { ModeTabs, ThreeDPanel } from "@/studio/three-d/three-d-panel"
import { useThreeDScreen } from "@/studio/three-d/use-three-d-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const screen = useThreeDScreen(app, seeds, () => sheetClose.current())
  const { state } = screen
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      tabs={<ModeTabs screen={screen} />}
      panel={<ThreeDPanel app={app} screen={screen} />}
      canvas={(openInputs) => (
        <ThreeDCanvas
          app={app}
          onUseInputs={screen.fillFromRun}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
