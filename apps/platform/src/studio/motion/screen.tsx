import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { useRouterState } from "@tanstack/react-router"
import { type ReactElement, useEffect, useRef } from "react"
import { tCatalog } from "@/copy/t"
import { PriceCaption } from "@/pieces/price-caption"
import { RunCard } from "@/pieces/run/run-card"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
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

/** The sentence that names the photos your draft left out, beside the draft at the head of your runs. */
function LeftOutNote({ state }: { state: MotionState }): ReactElement | null {
  const left = state.chain?.leftOut ?? null
  if (left === null) {
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

/** The draft a step of the chain waits on for your yes, or null. */
function waitingDraftOf(state: MotionState): Run | null {
  const stage = state.chain?.stage
  return stage !== undefined && "draft" in stage ? stage.draft : null
}

/** On a phone the draft that waits for your yes takes the full width, with the sentence about its photos. */
function DraftFocus({
  state,
  draft,
}: {
  state: MotionState
  draft: Run
}): ReactElement {
  return (
    <div data-slot="motion-draft" className="flex w-full flex-col gap-s2">
      <LeftOutNote state={state} />
      <RunCard run={draft} onUseInputs={state.useInputs} />
    </div>
  )
}

/** Closes the inputs' sheet once Generate starts the chain, so the draft shows as it arrives. */
function useSheetClosedOnStart(state: MotionState, close: () => void): void {
  const stage = state.chain?.stage.stage ?? "idle"
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    if (stage === "drafting") {
      closeRef.current()
    }
  }, [stage])
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
  useSheetClosedOnStart(state, () => sheet[1](false))
  const isRegular = useIsRegularWindow()
  const draft = isRegular ? null : waitingDraftOf(state)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<MotionPanel state={state} />}
      footLeading={<StartOver state={state} />}
      holdsPress={pressStages.includes(state.chain?.stage.stage ?? "idle")}
      canvas={(openInputs) =>
        draft === null ? (
          <AppCanvas
            app={app}
            onUseInputs={state.useInputs}
            emptyAction={<AddInputsButton onClick={openInputs} />}
            note={<LeftOutNote state={state} />}
          />
        ) : (
          <DraftFocus state={state} draft={draft} />
        )
      }
    />
  )
}
