import { useRouterState } from "@tanstack/react-router"
import { type ReactElement, useRef } from "react"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { MotionPanel, MotionTabs } from "@/studio/motion/motion-panel"
import { tabOfHash } from "@/studio/motion/motion-tabs"
import { useMotionScreen } from "@/studio/motion/use-motion-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const hash = useRouterState({ select: (state) => state.location.hash })
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useMotionScreen(
    app,
    seeds,
    () => sheetClose.current(),
    tabOfHash(hash)
  )
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      tabs={<MotionTabs state={state} />}
      panel={<MotionPanel state={state} />}
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
