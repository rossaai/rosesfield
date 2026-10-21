import { type ReactElement, useRef } from "react"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { AudioCanvas } from "@/studio/audio/audio-canvas"
import { AudioPanel, AudioTabs } from "@/studio/audio/audio-panel"
import { useAudioScreen } from "@/studio/audio/use-audio-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useAudioScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      tabs={<AudioTabs state={state} />}
      panel={<AudioPanel state={state} />}
      canvas={(openInputs) => (
        <AudioCanvas
          app={app}
          onUseInputs={state.fillFromRun}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
