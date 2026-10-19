import type { AppListing, Run } from "@rosesfield/contract"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useAppRuns } from "@/screens/app/app-canvas"
import { valuesFromRun } from "@/screens/app/app-form"
import { listOf, numberOf } from "@/screens/app/fields/field-props"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import {
  aspectInput,
  bodyAppFor,
  type ExpandMode,
  modeInput,
  modeOf,
  photoInput,
  ratioOf,
  type sideInputs,
} from "@/studio/expand/expand-modes"
import { type PhotoRead, usePhotoFacts } from "@/studio/expand/use-photo-facts"
import { canvasRatios } from "../../../../../packages/catalog/src/expand/comfy/expand-binding"
import {
  type FormatCheck,
  formatCheckOf,
  hasNoSpace,
  nearestRatioOf,
  type PhotoProblem,
  photoProblemOf,
  type Shares,
  type SidesCheck,
  type Size,
  sidesCheckOf,
} from "../../../../../packages/catalog/src/expand/expand-plan"

export type ExpandState = {
  app: AppListing
  mode: ExpandMode
  format: string
  form: AppForm
  start: StartRun
  photoSize: Size | null
  photoState: PhotoRead["state"]
  photoProblem: PhotoProblem | null
  formatCheck: FormatCheck | null
  sidesCheck: SidesCheck | null
  hasAskedForSpace: boolean
  lastSeed: number | null
  hasRuns: boolean | null
  setFormat: (format: string) => void
  registerFormat: (focus: () => void) => void
  registerWell: (focus: () => void) => void
  registerTop: (focus: () => void) => void
  useInputs: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

function sharesOf(form: AppForm): Shares {
  const value = (name: (typeof sideInputs)[number]): number =>
    numberOf(form.values.inputs[name], 0)
  return {
    top: value("top"),
    right: value("right"),
    bottom: value("bottom"),
    left: value("left"),
  }
}

function useFocuser(): [() => void, (focus: () => void) => void] {
  const focuser = useRef<() => void>(() => undefined)
  const register = useCallback((focus: () => void) => {
    focuser.current = focus
  }, [])
  return [() => focuser.current(), register]
}

function useCanvasRatio(
  form: AppForm,
  mode: ExpandMode,
  format: string,
  sidesCheck: SidesCheck | null
): void {
  const { setForm } = form
  const current = form.values.aspectRatio
  const wanted =
    mode === "format"
      ? format
      : sidesCheck?.state === "fits"
        ? nearestRatioOf(canvasRatios, sidesCheck.plan.canvas)
        : null
  useEffect(() => {
    if (wanted !== null && wanted !== current) {
      setForm({ aspectRatio: wanted })
    }
  }, [current, setForm, wanted])
}

type Checks = {
  assetId: string | null
  photoSize: Size | null
  photoState: PhotoRead["state"]
  photoProblem: PhotoProblem | null
  formatCheck: FormatCheck | null
  sidesCheck: SidesCheck | null
}

function useChecks(form: AppForm, format: string): Checks {
  const [assetId = null] = listOf(form.values.inputs[photoInput])
  const read = usePhotoFacts(assetId)
  const facts = read.state === "empty" ? null : read.facts
  const photoSize = read.state === "read" ? read.size : null
  const shares = sharesOf(form)
  return {
    assetId,
    photoSize,
    photoState: read.state,
    photoProblem: facts === null ? null : photoProblemOf(facts),
    formatCheck: photoSize === null ? null : formatCheckOf(photoSize, format),
    sidesCheck: hasNoSpace(shares)
      ? { state: "noSpace" }
      : photoSize === null
        ? null
        : sidesCheckOf(photoSize, shares),
  }
}

function useWaitForPhoto(
  checks: Checks,
  generate: () => void
): [boolean, () => void] {
  const [waitingFor, setWaitingFor] = useState<string | null>(null)
  const latest = useRef(generate)
  latest.current = generate
  const isWaiting = waitingFor !== null && waitingFor === checks.assetId
  const isReading = checks.photoState === "reading"
  useEffect(() => {
    if (waitingFor === null) {
      return
    }
    if (waitingFor !== checks.assetId) {
      setWaitingFor(null)
    } else if (!isReading) {
      setWaitingFor(null)
      latest.current()
    }
  }, [checks.assetId, isReading, waitingFor])
  return [isWaiting, () => setWaitingFor(checks.assetId)]
}

function useAskedForSpace(form: AppForm): [boolean, () => void] {
  const [hasAsked, setAsked] = useState(false)
  const sharesKey = Object.values(sharesOf(form)).join(",")
  useEffect(() => {
    if (sharesKey !== "") {
      setAsked(false)
    }
  }, [sharesKey])
  return [hasAsked, () => setAsked(true)]
}

export function useExpandScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): ExpandState {
  const form = useAppForm(app, seeds)
  const mode = modeOf(form.values.inputs[modeInput])
  const bodyApp = useMemo(() => bodyAppFor(app, mode), [app, mode])
  const format = ratioOf(form.values.inputs[aspectInput])
  const checks = useChecks(form, format)
  useCanvasRatio(form, mode, format, checks.sidesCheck)
  const [hasAskedForSpace, askForSpace] = useAskedForSpace(form)
  const base = useStartRun(bodyApp, form, onStarted)
  const runs = useAppRuns(app)
  const [focusFormat, registerFormat] = useFocuser()
  const [focusWell, registerWell] = useFocuser()
  const [focusTop, registerTop] = useFocuser()
  const generate = (): void => {
    if (checks.photoProblem !== null || checks.photoState === "unreadable") {
      focusWell()
    } else if (mode === "sides" && checks.sidesCheck?.state === "noSpace") {
      askForSpace()
      focusTop()
    } else if (checks.photoState === "reading") {
      waitForPhoto()
    } else if (
      mode === "format" &&
      checks.formatCheck?.state !== undefined &&
      checks.formatCheck.state !== "fits"
    ) {
      focusFormat()
    } else {
      base.generate()
    }
  }
  const [isWaiting, waitForPhoto] = useWaitForPhoto(checks, generate)
  return {
    app,
    mode,
    format,
    form,
    start: { ...base, isPending: base.isPending || isWaiting, generate },
    photoSize: checks.photoSize,
    photoState: checks.photoState,
    photoProblem: checks.photoProblem,
    formatCheck: checks.formatCheck,
    sidesCheck: checks.sidesCheck,
    hasAskedForSpace,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    setFormat: (next) => form.setInput(aspectInput, next),
    registerFormat,
    registerWell,
    registerTop,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        generate()
      }
    },
  }
}
