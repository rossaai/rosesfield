import { type ReactElement, useRef } from "react"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { useVideoScreen } from "@/studio/video/use-video-screen"
import { ModeTabs, VideoPanel } from "@/studio/video/video-panel"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const screen = useVideoScreen(app, seeds, () => sheetClose.current())
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
      panel={<VideoPanel app={app} screen={screen} />}
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
