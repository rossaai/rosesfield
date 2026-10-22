import type { AppListing, Run } from "@rosesfield/contract"
import {
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from "react"
import { defaultAspectOf } from "@/catalog/app-facts"
import { tCatalog } from "@/copy/t"
import { ScreenState } from "@/pieces/screen-state"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import { listOf } from "@/screens/app/fields/field-props"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppScreenState, useAppScreen } from "@/screens/app/use-app-screen"
import type { StartRun } from "@/screens/app/use-start-run"
import { ScreenHeader } from "@/shell/screen-header"
import { EffectAgain } from "@/studio/effects/effect-again"
import { autoAspect, EffectsPanel } from "@/studio/effects/effects-panel"
import { nearestRatio } from "@/studio/effects/nearest-ratio"
import { useCheckedStart } from "@/studio/effects/use-checked-start"
import { useEffectAgain } from "@/studio/effects/use-effect-again"
import { useOfferedApp } from "@/studio/effects/use-offered-app"
import {
  acceptOf,
  type PhotoSize,
  photoCheckOf,
  usePhotoChecks,
} from "@/studio/effects/use-photo-checks"

const followRun = ""
const photoInput = "image"

type EffectsState = {
  screen: AppScreenState
  start: StartRun
  panel: {
    aspect: string
    aspects: readonly string[]
    onAspect: (aspect: string) => void
    photoMessage: string | null
    onPhotoMessage: (message: string | null) => void
  }
  onUseInputs: (run: Run) => void
  onNewPhoto: () => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

type EffectsEvents = {
  onStarted: () => void
  onRefused: () => void
}

function aspectsOf(app: AppListing): readonly string[] {
  return app.output.kind === "video" || app.output.kind === "image"
    ? app.output.aspectRatios.options
    : []
}

function useAspectChoice(
  app: AppListing,
  screen: AppScreenState,
  isSeeded: boolean,
  sizeOf: (assetId: string) => PhotoSize | undefined
): {
  aspect: string
  isSettled: boolean
  setChoice: (aspect: string) => void
} {
  const { form } = screen
  const [choice, setChoice] = useState(isSeeded ? followRun : autoAspect)
  const photoId = listOf(form.values.inputs[photoInput])[0]
  const photoSize = photoId === undefined ? undefined : sizeOf(photoId)
  let target: string | null = choice === followRun ? null : choice
  if (choice === autoAspect) {
    target =
      photoSize === undefined
        ? defaultAspectOf(app)
        : nearestRatio(aspectsOf(app), photoSize)
  }
  const current = form.values.aspectRatio
  const { setForm } = form
  useEffect(() => {
    if (target !== null && target !== current) {
      setForm({ aspectRatio: target })
    }
  }, [target, current, setForm])
  return {
    aspect: choice === followRun ? (current ?? autoAspect) : choice,
    isSettled: target === null || target === current,
    setChoice,
  }
}

function useEffectsState(
  app: AppListing,
  props: StudioScreenProps,
  events: EffectsEvents
): EffectsState {
  const screen = useAppScreen(app, props.seeds, events.onStarted)
  const [check] = useState(() => photoCheckOf(acceptOf(app, photoInput)))
  const photos = usePhotoChecks(screen.form, photoInput, check)
  const aspect = useAspectChoice(
    app,
    screen,
    props.seeds.from !== undefined,
    photos.sizeOf
  )
  const start = useCheckedStart(
    screen.start,
    screen.form,
    photos.isClear && aspect.isSettled,
    events.onRefused
  )
  const { useInputs: fillForm } = screen
  return {
    screen,
    start,
    panel: {
      aspect: aspect.aspect,
      aspects: aspectsOf(app),
      onAspect: aspect.setChoice,
      photoMessage: photos.message,
      onPhotoMessage: photos.setMessage,
    },
    onUseInputs: (run) => {
      fillForm(run)
      aspect.setChoice(run.aspectRatio ?? autoAspect)
    },
    onNewPhoto: () => aspect.setChoice(autoAspect),
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}

function ClosedScreen({ app }: { app: AppListing }): ReactElement {
  return (
    <>
      <ScreenHeader title={tCatalog(app.nameKey)} />
      <ScreenState kind="empty" title={tCatalog(app.closedKey ?? "")} />
    </>
  )
}

export function AppScreen(props: StudioScreenProps): ReactElement {
  const app = useOfferedApp(props.app)
  return app.closedKey === null ? (
    <OpenScreen {...props} app={app} />
  ) : (
    <ClosedScreen app={app} />
  )
}

function OpenScreen(props: StudioScreenProps): ReactElement {
  const { app } = props
  const sheetOpen = useRef<(open: boolean) => void>(() => undefined)
  const isRegular = useIsRegularWindow()
  const state = useEffectsState(app, props, {
    onStarted: () => sheetOpen.current(false),
    onRefused: () => {
      if (!isRegular) {
        sheetOpen.current(true)
      }
    },
  })
  const { screen } = state
  const sheet = useSheetOpen()
  sheetOpen.current = sheet[1]
  const again = useEffectAgain({
    form: screen.form,
    fill: state.onUseInputs,
    openInputs: () => {
      if (!isRegular) {
        sheet[1](true)
      }
    },
    onNewPhoto: state.onNewPhoto,
  })
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={
        <EffectsPanel
          app={app}
          form={again.form}
          lastSeed={screen.lastSeed}
          {...state.panel}
        />
      }
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          onUseInputs={state.onUseInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
          afterRun={(run) => (
            <EffectAgain
              run={run}
              onAnotherPhoto={again.onAnotherPhoto}
              onAnotherEffect={again.onAnotherEffect}
            />
          )}
        />
      )}
    />
  )
}
