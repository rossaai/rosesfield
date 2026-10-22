import { type ReactElement, useRef } from "react"
import { AddInputsButton, useSheetOpen } from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { StoryboardCanvas } from "@/studio/storyboard/storyboard-canvas"
import { StoryboardFrame } from "@/studio/storyboard/storyboard-frame"
import { StoryboardPanel } from "@/studio/storyboard/storyboard-panel"
import { useStoryboardScreen } from "@/studio/storyboard/use-storyboard-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useStoryboardScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <StoryboardFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<StoryboardPanel app={app} state={state} />}
      canvas={(openInputs) => (
        <StoryboardCanvas
          app={app}
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
