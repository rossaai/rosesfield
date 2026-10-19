import type { AppListing } from "@rosesfield/contract"
import type { KeyboardEvent } from "react"
import { textOf } from "@/screens/app/fields/field-props"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppScreenState, useAppScreen } from "@/screens/app/use-app-screen"
import { useCheckedStart } from "@/studio/effects/use-checked-start"
import { usePhotoChecks } from "@/studio/effects/use-photo-checks"
import { checkHeadshotPhoto } from "@/studio/headshots/photo-check"

export const photoInput = "image"

export type HeadshotsScreenState = AppScreenState & {
  app: AppListing
  photoMessage: string | null
  onPhotoMessage: (message: string | null) => void
}

export function useHeadshotsScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void,
  onRefused: () => void
): HeadshotsScreenState {
  const screen = useAppScreen(app, seeds, onStarted)
  const photos = usePhotoChecks(screen.form, photoInput, checkHeadshotPhoto)
  const start = useCheckedStart(
    screen.start,
    screen.form,
    photos.isClear,
    onRefused
  )
  return {
    ...screen,
    app,
    start,
    photoMessage: photos.message,
    onPhotoMessage: photos.setMessage,
    onShortcut: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}

export function choiceValue(state: HeadshotsScreenState, name: string): string {
  const input = state.app.inputs.find((one) => one.name === name)
  const fallback = input?.type === "choice" ? input.default : ""
  return textOf(state.form.values.inputs[name]) || fallback
}
