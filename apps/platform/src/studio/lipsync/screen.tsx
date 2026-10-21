import { type ReactElement, useRef } from "react"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { LipsyncModeTabs, LipsyncPanel } from "@/studio/lipsync/lipsync-panel"
import { useLipsyncScreen } from "@/studio/lipsync/use-lipsync-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const screen = useLipsyncScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={screen.start}
      onShortcut={screen.onShortcut}
      sheet={sheet}
      tabs={<LipsyncModeTabs screen={screen} />}
      panel={<LipsyncPanel screen={screen} />}
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          order="newest-first"
          onUseInputs={screen.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
