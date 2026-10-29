import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { useRouterState } from "@tanstack/react-router"
import { type ReactElement, useRef } from "react"
import { tCatalog } from "@/copy/t"
import { PriceCaption } from "@/pieces/price-caption"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { leftOutText } from "@/studio/motion/left-out"
import { MotionPanel } from "@/studio/motion/motion-panel"
import { tabOfHash } from "@/studio/motion/motion-tabs"
import {
  type MotionState,
  useMotionScreen,
} from "@/studio/motion/use-motion-screen"

function StartOver({ state }: { state: MotionState }): ReactElement | null {
  if (state.chain?.canStartOver !== true) {
    return null
  }
  return (
    <Button onClick={state.chain?.startOver}>
      {tCatalog("motion.chain.startOver")}
    </Button>
  )
}

const pressStages: readonly string[] = [
  "makeFinal",
  "restoring",
  "renderFinal",
  "finishing",
]

function LeftOutNote({
  state,
  run,
}: {
  state: MotionState
  run: Run
}): ReactElement | null {
  const left = state.chain?.leftOut ?? null
  if (left === null || left.draftId !== run.id) {
    return null
  }
  return (
    <PriceCaption
      text={leftOutText(left.photos)}
      slot="motion-left-out"
      wraps
    />
  )
}

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
      panel={<MotionPanel state={state} />}
      footLeading={<StartOver state={state} />}
      holdsPress={pressStages.includes(state.chain?.stage.stage ?? "idle")}
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
          afterRun={(run) => <LeftOutNote state={state} run={run} />}
        />
      )}
    />
  )
}
