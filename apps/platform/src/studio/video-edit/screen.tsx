import { type ReactElement, useRef } from "react"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { useVideoEditScreen } from "@/studio/video-edit/use-video-edit-screen"
import { VideoEditCanvas } from "@/studio/video-edit/video-edit-canvas"
import { ModeTabs, VideoEditPanel } from "@/studio/video-edit/video-edit-panel"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useVideoEditScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      tabs={<ModeTabs state={state} />}
      panel={<VideoEditPanel state={state} />}
      canvas={(openInputs) => (
        <VideoEditCanvas
          app={app}
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
