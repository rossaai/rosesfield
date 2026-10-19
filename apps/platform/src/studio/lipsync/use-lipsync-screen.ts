import type { AppListing, Run } from "@rosesfield/contract"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { useAppRuns } from "@/screens/app/app-canvas"
import { type FieldProblem, valuesFromRun } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import {
  audioLimits,
  clipLimits,
  lengthOf,
  type MediaFacts,
  nearestRatio,
  photoLimits,
  problemOf,
} from "@/studio/lipsync/lipsync-checks"
import {
  audioInput,
  bodyAppFor,
  clipInput,
  formAppFor,
  type LipsyncMode,
  lengthInput,
  modeInput,
  modeOf,
  photoInput,
} from "@/studio/lipsync/lipsync-modes"
import {
  type MediaKind,
  type MediaReading,
  useMediaFacts,
} from "@/studio/lipsync/use-media-facts"

export const autoAspect = "auto"

type Problems = Readonly<Record<string, FieldProblem | undefined>>

export type LipsyncState = {
  app: AppListing
  formApp: AppListing
  mode: LipsyncMode
  form: AppForm
  start: StartRun
  aspect: string
  setAspect: (aspect: string) => void
  problems: Problems
  lastSeed: number | null
  hasRuns: boolean | null
  useInputs: (run: Run) => void
  registerWell: (name: string, focus: () => void) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

const limitsOf = {
  [photoInput]: photoLimits,
  [clipInput]: clipLimits,
  [audioInput]: audioLimits,
}

function useWell(
  form: AppForm,
  name: keyof typeof limitsOf,
  kind: MediaKind,
  setProblems: (change: (current: Problems) => Problems) => void
): MediaFacts | null {
  const [first = null] = listOf(form.values.inputs[name])
  const reading: MediaReading = useMediaFacts(first, kind)
  const facts = reading.state === "read" ? reading.facts : null
  const failed = reading.state === "failed"
  const { setInput } = form
  useEffect(() => {
    if (facts === null && !failed) {
      return
    }
    const problem: FieldProblem | null =
      facts === null
        ? { name, key: "field.asset.required", values: {} }
        : problemOf(facts, limitsOf[name])
    setProblems((current) => ({ ...current, [name]: problem ?? undefined }))
    if (problem !== null) {
      setInput(name, [])
    }
  }, [facts, failed, name, setInput, setProblems])
  return facts
}

function useShape(
  form: AppForm,
  mode: LipsyncMode,
  aspect: string,
  source: MediaFacts | null
): void {
  const setForm = useRef(form.setForm)
  setForm.current = form.setForm
  const width = source?.width ?? null
  const height = source?.height ?? null
  const current = form.values.aspectRatio
  useEffect(() => {
    const chosen =
      mode === "photo" && aspect !== autoAspect
        ? aspect
        : width === null || height === null
          ? null
          : nearestRatio(width, height)
    if (chosen !== null && chosen !== current) {
      setForm.current({ aspectRatio: chosen })
    }
  }, [mode, aspect, width, height, current])
}

function useLength(form: AppForm, audio: MediaFacts | null): void {
  const seconds = audio?.seconds ?? null
  const { setInput } = form
  const current = form.values.inputs[lengthInput]
  useEffect(() => {
    if (seconds === null) {
      return
    }
    const length = lengthOf(seconds)
    if (length !== current) {
      setInput(lengthInput, length)
    }
  }, [seconds, current, setInput])
}

function useSeededMode(form: AppForm): void {
  const decided = useRef(false)
  const photo = listOf(form.values.inputs[photoInput]).length
  const clip = listOf(form.values.inputs[clipInput]).length
  const { setInput } = form
  useEffect(() => {
    if (decided.current || photo + clip === 0) {
      return
    }
    decided.current = true
    if (photo === 0) {
      setInput(modeInput, "clip")
    }
  }, [photo, clip, setInput])
}

function useLipsyncForm(app: AppListing, seeds: StudioScreenProps["seeds"]) {
  const [mode, setMode] = useState<LipsyncMode>("photo")
  const [aspect, setAspect] = useState(autoAspect)
  const [problems, setProblems] = useState<Problems>({})
  const formApp = useMemo(() => formAppFor(app, mode), [app, mode])
  const bodyApp = useMemo(() => bodyAppFor(app, mode), [app, mode])
  const form = useAppForm(formApp, seeds)
  const formMode = modeOf(form.values)
  useEffect(() => {
    setMode(formMode)
  }, [formMode])
  useSeededMode(form)
  const photo = useWell(form, photoInput, "image", setProblems)
  const clip = useWell(form, clipInput, "video", setProblems)
  const audio = useWell(form, audioInput, "audio", setProblems)
  useShape(form, mode, aspect, mode === "photo" ? photo : clip)
  useLength(form, audio)
  return { mode, aspect, setAspect, problems, formApp, bodyApp, form, audio }
}

function guardedStart(options: {
  started: StartRun
  form: AppForm
  wells: readonly string[]
  isWaiting: (name: string) => boolean
  focus: (name: string) => void
}): StartRun {
  return {
    ...options.started,
    generate: () => {
      if (!options.form.validate()) {
        return
      }
      const waiting = options.wells.find(options.isWaiting)
      if (waiting !== undefined) {
        options.focus(waiting)
        return
      }
      options.started.generate()
    },
  }
}

export function useLipsyncScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): LipsyncState {
  const lipsync = useLipsyncForm(app, seeds)
  const { mode, form, problems, audio, setAspect } = lipsync
  const started = useStartRun(lipsync.bodyApp, form, onStarted)
  const focusers = useRef(new Map<string, () => void>())
  const start = guardedStart({
    started,
    form,
    wells: [mode === "photo" ? photoInput : clipInput, audioInput],
    isWaiting: (name) =>
      problems[name] !== undefined ||
      (name === audioInput && (audio?.seconds ?? null) === null),
    focus: (name) => focusers.current.get(name)?.(),
  })
  const runs = useAppRuns(app)
  return {
    app,
    formApp: lipsync.formApp,
    mode,
    form,
    start,
    aspect: lipsync.aspect,
    setAspect,
    problems,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: (run) => {
      form.fill(valuesFromRun(app, run))
      setAspect(run.aspectRatio ?? autoAspect)
    },
    registerWell: (name, focus) => {
      focusers.current.set(name, focus)
    },
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}
