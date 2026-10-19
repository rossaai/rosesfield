import { type AppListing, fixedCountOf, type Run } from "@rosesfield/contract"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { tCatalog } from "@/copy/t"
import { useAppRuns } from "@/screens/app/app-canvas"
import { valuesFromRun } from "@/screens/app/app-form"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import { bodyAppFor, modeInput } from "@/studio/angles/angles-modes"
import {
  type ImageFacts,
  type ImageReading,
  nearestRatio,
  refusalOf,
  useImageFacts,
} from "@/studio/angles/image-check"
import {
  type Mode,
  modes,
} from "../../../../../packages/catalog/src/angles/angle-views"

export const imageInput = "image"

export type AnglesScreenState = {
  app: AppListing
  mode: Mode
  form: AppForm
  start: StartRun
  image: ImageFacts | null
  imageRefusal: string | null
  imageNote: string | null
  retryImage: (() => void) | null
  lastSeed: number | null
  hasRuns: boolean | null
  useInputs: (run: Run) => void
  registerImage: (focus: () => void) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

export function modeOf(value: unknown): Mode {
  return modes.find((mode) => mode === value) ?? "set"
}

function aspectsOf(app: AppListing): readonly string[] {
  return app.output.kind === "image" ? app.output.aspectRatios.options : []
}

function useOutputShape(
  app: AppListing,
  form: AppForm,
  image: ImageFacts | null
): boolean {
  const { setForm } = form
  const count =
    fixedCountOf(app, form.values.inputs) ?? app.output.count.default
  const current = form.values.count
  useEffect(() => {
    if (current !== count) {
      setForm({ count })
    }
  }, [count, current, setForm])
  const size = image?.size ?? null
  const ratio = size === null ? null : nearestRatio(aspectsOf(app), size)
  const currentRatio = form.values.aspectRatio
  useEffect(() => {
    if (ratio !== null && ratio !== currentRatio) {
      setForm({ aspectRatio: ratio })
    }
  }, [ratio, currentRatio, setForm])
  return current === count && (ratio === null || ratio === currentRatio)
}

function refusalFor(reading: ImageReading): string | null {
  switch (reading.state) {
    case "read":
      return refusalOf(reading.facts)
    case "failed":
      return tCatalog("angles.input.image.loadFailed")
    default:
      return null
  }
}

export function useQueuedStart(
  form: AppForm,
  started: StartRun,
  reading: ImageReading,
  isShaped: boolean,
  focusImage: () => void
): { start: StartRun; isWaiting: boolean } {
  const [isWaiting, setWaiting] = useState(false)
  const generate = useRef(started.generate)
  generate.current = started.generate
  const focus = useRef(focusImage)
  focus.current = focusImage
  const isReady = reading.state === "read" && refusalOf(reading.facts) === null
  const isReading = reading.state === "reading"
  useEffect(() => {
    if (!isWaiting || isReading || (isReady && !isShaped)) {
      return
    }
    setWaiting(false)
    if (isReady) {
      generate.current()
      return
    }
    focus.current()
  }, [isWaiting, isReading, isReady, isShaped])
  const start: StartRun = {
    ...started,
    isPending: started.isPending || isWaiting,
    generate: () => {
      if (isWaiting || !form.validate()) {
        return
      }
      if (isReading) {
        setWaiting(true)
        return
      }
      if (!isReady) {
        focus.current()
        return
      }
      if (!isShaped) {
        setWaiting(true)
        return
      }
      started.generate()
    },
  }
  return { start, isWaiting }
}

export function useAnglesScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): AnglesScreenState {
  const form = useAppForm(app, seeds)
  const mode = modeOf(form.values.inputs[modeInput])
  const bodyApp = useMemo(() => bodyAppFor(app, mode), [app, mode])
  const [first = null] = listOf(form.values.inputs[imageInput])
  const reading = useImageFacts(first)
  const image = reading.state === "read" ? reading.facts : null
  const isShaped = useOutputShape(app, form, image)
  const started = useStartRun(bodyApp, form, onStarted)
  const focusImage = useRef<() => void>(() => undefined)
  const { start, isWaiting } = useQueuedStart(
    form,
    started,
    reading,
    isShaped,
    () => focusImage.current()
  )
  const runs = useAppRuns(app)
  return {
    app,
    mode,
    form,
    start,
    image,
    imageRefusal: refusalFor(reading),
    imageNote: isWaiting ? tCatalog("angles.input.image.reading") : null,
    retryImage: reading.state === "failed" ? reading.retry : null,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    registerImage: (focus) => {
      focusImage.current = focus
    },
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}

export function choiceValue(state: AnglesScreenState, name: string): string {
  const input = state.app.inputs.find((one) => one.name === name)
  const fallback = input?.type === "choice" ? input.default : ""
  return textOf(state.form.values.inputs[name]) || fallback
}
