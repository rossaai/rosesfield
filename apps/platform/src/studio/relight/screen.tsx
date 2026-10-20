import { type KeyboardEvent, type ReactElement, useEffect, useRef } from "react"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { useAppScreen } from "@/screens/app/use-app-screen"
import { useCheckedStart } from "@/studio/effects/use-checked-start"
import { RelightPanel } from "@/studio/relight/relight-panel"
import { useRelightPhoto } from "@/studio/relight/use-relight-photo"

function useOpenOnMessage(
  message: string | null,
  isRegular: boolean,
  setSheetOpen: (open: boolean) => void
): void {
  useEffect(() => {
    if (message !== null && !isRegular) {
      setSheetOpen(true)
    }
  }, [message, isRegular, setSheetOpen])
}

function useRelightScreen({ app, seeds }: StudioScreenProps) {
  const sheetClose = useRef<() => void>(() => undefined)
  const screen = useAppScreen(app, seeds, () => sheetClose.current())
  const photo = useRelightPhoto(app, screen.form)
  const sheet = useSheetOpen()
  const setSheetOpen = sheet[1]
  const isRegular = useIsRegularWindow()
  sheetClose.current = () => setSheetOpen(false)
  useOpenOnMessage(photo.message, isRegular, setSheetOpen)
  const start = useCheckedStart(
    screen.start,
    screen.form,
    photo.isReady,
    () => {
      if (!isRegular) {
        setSheetOpen(true)
      }
    }
  )
  const onShortcut = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      start.generate()
    }
  }
  return {
    screen,
    photo,
    start,
    onShortcut,
    sheet,
  }
}

export function AppScreen(props: StudioScreenProps): ReactElement {
  const { app } = props
  const { screen, photo, start, onShortcut, sheet } = useRelightScreen(props)
  return (
    <ColumnFrame
      app={app}
      start={start}
      onShortcut={onShortcut}
      sheet={sheet}
      panel={
        <RelightPanel
          app={app}
          form={screen.form}
          lastSeed={screen.lastSeed}
          photo={photo}
        />
      }
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
