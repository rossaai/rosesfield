import {
  type AppListing,
  type InputDefinition,
  inputRulesOf,
  type Run,
} from "@rosesfield/contract"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { useAppRuns } from "@/screens/app/app-canvas"
import { valuesFromRun } from "@/screens/app/app-form"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import {
  type FileProblem,
  isUpscaleMode,
  nearestRatioOf,
  readingProblemOf,
  type ScaleCheck,
  scaleCheckOf,
  sizeOf,
  type UpscaleMode,
} from "@/studio/upscale/upscale-limits"
import { useFileFacts } from "@/studio/upscale/use-file-facts"

export const modeInput = "mode"
export const scaleInput = "scale"
export const modelInput = "model"

export type UpscaleState = {
  app: AppListing
  mode: UpscaleMode
  form: AppForm
  start: StartRun
  fileMessage: string | null
  scaleCheck: ScaleCheck
  lastSeed: number | null
  hasRuns: boolean | null
  registerScale: (focus: () => void) => void
  registerWell: (focus: () => void) => void
  useInputs: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

function appliedIn(app: AppListing, mode: UpscaleMode): ReadonlySet<string> {
  return new Set(
    inputRulesOf(app, { [modeInput]: mode }).map((rule) => rule.input.name)
  )
}

function optional(input: InputDefinition): InputDefinition {
  return "presence" in input ? { ...input, presence: "optional" } : input
}

export function formAppFor(app: AppListing, mode: UpscaleMode): AppListing {
  const applied = appliedIn(app, mode)
  return {
    ...app,
    inputs: app.inputs.map((input) =>
      applied.has(input.name) ? input : optional(input)
    ),
  }
}

export function bodyAppFor(app: AppListing, mode: UpscaleMode): AppListing {
  const applied = appliedIn(app, mode)
  return {
    ...app,
    inputs: app.inputs.filter((input) => applied.has(input.name)),
  }
}

export function modeOf(value: unknown): UpscaleMode {
  return isUpscaleMode(value) ? value : "image"
}

export function messageOf(mode: UpscaleMode, problem: FileProblem): string {
  switch (problem.kind) {
    case "wrongKind":
      return t("field.asset.wrongKind", {
        kinds: tCatalog(`upscale.input.${mode}.kinds`),
      })
    case "unreadable":
      return tCatalog(`upscale.input.${mode}.unreadable`)
    case "tooLarge":
      return t("field.asset.tooLarge", {
        size: formatBytes(problem.bytes),
        limit: formatBytes(problem.limit),
      })
    case "tooSmall":
      return tCatalog(`upscale.input.${mode}.tooSmall`, {
        side: problem.side,
        min: problem.min,
      })
    case "tooLong":
      return t("field.asset.tooLong", {
        seconds: problem.seconds,
        max: problem.max,
      })
    case "tooShort":
      return t("field.asset.tooShort", {
        seconds: problem.seconds,
        min: problem.min,
      })
  }
}

function useModeFromUse(form: AppForm, mode: UpscaleMode): void {
  const settled = useRef(false)
  const hasVideo = listOf(form.values.inputs.video).length > 0
  const hasImage = listOf(form.values.inputs.image).length > 0
  const { setInput } = form
  useEffect(() => {
    if (settled.current || !(hasVideo || hasImage)) {
      return
    }
    settled.current = true
    if (mode === "image" && hasVideo && !hasImage) {
      setInput(modeInput, "video")
    }
  }, [hasImage, hasVideo, mode, setInput])
}

function useRatioFromFile(form: AppForm, ratio: string | null): void {
  const { setForm } = form
  const current = form.values.aspectRatio
  useEffect(() => {
    if (ratio !== null && ratio !== current) {
      setForm({ aspectRatio: ratio })
    }
  }, [current, ratio, setForm])
}

function useFocuser(): [() => void, (focus: () => void) => void] {
  const focuser = useRef<() => void>(() => undefined)
  const register = useCallback((focus: () => void) => {
    focuser.current = focus
  }, [])
  return [() => focuser.current(), register]
}

export function useUpscaleScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): UpscaleState {
  const [mode, setMode] = useState<UpscaleMode>("image")
  const formApp = useMemo(() => formAppFor(app, mode), [app, mode])
  const bodyApp = useMemo(() => bodyAppFor(app, mode), [app, mode])
  const form = useAppForm(formApp, seeds)
  const formMode = modeOf(form.values.inputs[modeInput])
  useEffect(() => {
    setMode(formMode)
  }, [formMode])
  return useUpscaleState(app, mode, form, bodyApp, onStarted)
}

function useUpscaleState(
  app: AppListing,
  mode: UpscaleMode,
  form: AppForm,
  bodyApp: AppListing,
  onStarted: () => void
): UpscaleState {
  const [assetId = null] = listOf(form.values.inputs[mode])
  const reading = useFileFacts(assetId, mode)
  const facts = reading.state === "read" ? reading.facts : null
  const size = sizeOf(facts)
  const scale = textOf(form.values.inputs[scaleInput]) || "2x"
  const problem = readingProblemOf(mode, reading)
  const check = scaleCheckOf(size, scale)
  const options =
    app.output.kind === "image" || app.output.kind === "video"
      ? app.output.aspectRatios.options
      : []
  useRatioFromFile(form, size === null ? null : nearestRatioOf(options, size))
  useModeFromUse(form, mode)
  const base = useStartRun(bodyApp, form, onStarted)
  const runs = useAppRuns(app)
  const [focusScale, registerScale] = useFocuser()
  const [focusWell, registerWell] = useFocuser()
  const generate = (): void => {
    if (reading.state === "reading" || problem !== null) {
      focusWell()
      return
    }
    if (check.state === "tooBig") {
      focusScale()
      return
    }
    base.generate()
  }
  const start: StartRun = { ...base, generate }
  return {
    app,
    mode,
    form,
    start,
    fileMessage: problem === null ? null : messageOf(mode, problem),
    scaleCheck: check,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    registerScale,
    registerWell,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        generate()
      }
    },
  }
}
