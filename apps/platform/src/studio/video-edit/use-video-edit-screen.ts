import type { AppListing, Run } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { type KeyboardEvent, useEffect, useMemo, useRef } from "react"
import { assetQuery } from "@/api/queries"
import { formatBytes, formatSeconds } from "@/copy/format"
import { useAppRuns } from "@/screens/app/app-canvas"
import { type FieldProblem, valuesFromRun } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import {
  type ClipFacts,
  hasSameFormat,
  largestClipBytes,
  longestClipSeconds,
  nearestRatio,
  shortestClipSeconds,
  useClipFacts,
} from "@/studio/video-edit/use-clip-facts"
import {
  aspectInput,
  bodyAppFor,
  modeOf,
  ratioOfFormat,
  sourceInput,
  type VideoEditMode,
} from "@/studio/video-edit/video-edit-modes"

export type VideoEditState = {
  app: AppListing
  mode: VideoEditMode
  form: AppForm
  start: StartRun
  clip: ClipFacts | null
  clipProblem: FieldProblem | undefined
  isSameFormat: boolean
  lastSeed: number | null
  hasRuns: boolean | null
  useInputs: (run: Run) => void
  register: (name: string, focus: () => void) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

function problemOf(
  clip: ClipFacts | null,
  bytes: number | null
): FieldProblem | undefined {
  if (bytes !== null && bytes > largestClipBytes) {
    return {
      name: sourceInput,
      key: "field.asset.tooLarge",
      values: {
        size: formatBytes(bytes),
        limit: formatBytes(largestClipBytes),
      },
    }
  }
  if (clip === null) {
    return undefined
  }
  const seconds = formatSeconds(clip.seconds)
  if (clip.seconds < shortestClipSeconds) {
    return {
      name: sourceInput,
      key: "field.asset.tooShort",
      values: { seconds, min: shortestClipSeconds },
    }
  }
  return clip.seconds > longestClipSeconds
    ? {
        name: sourceInput,
        key: "field.asset.tooLong",
        values: { seconds, max: longestClipSeconds },
      }
    : undefined
}

function useClip(form: AppForm, app: AppListing, mode: VideoEditMode) {
  const [first = null] = listOf(form.values.inputs[sourceInput])
  const clip = useClipFacts(first)
  const asset = useQuery({
    ...assetQuery(first ?? ""),
    enabled: first !== null,
  })
  const bytes = first === null ? null : (asset.data?.asset.bytes ?? null)
  const format = ratioOfFormat(form.values.inputs[aspectInput])
  const options =
    app.output.kind === "video" ? app.output.aspectRatios.options : []
  const ratio =
    mode === "reframe"
      ? format
      : clip === null
        ? null
        : nearestRatio(clip, options)
  const { setForm } = form
  const current = form.values.aspectRatio
  useEffect(() => {
    if (ratio !== null && ratio !== current) {
      setForm({ aspectRatio: ratio })
    }
  }, [current, ratio, setForm])
  const isSameFormat =
    mode === "reframe" &&
    clip !== null &&
    format !== null &&
    hasSameFormat(clip, format)
  return { clip, clipProblem: problemOf(clip, bytes), isSameFormat }
}

function useGenerate(
  form: AppForm,
  started: StartRun,
  checks: { clipProblem: FieldProblem | undefined; isSameFormat: boolean },
  focusers: Map<string, () => void>
): StartRun {
  return {
    ...started,
    generate: () => {
      const isFormValid = form.validate()
      if (!isFormValid) {
        return
      }
      if (checks.clipProblem !== undefined) {
        focusers.get(sourceInput)?.()
        return
      }
      if (checks.isSameFormat) {
        focusers.get(aspectInput)?.()
        return
      }
      started.generate()
    },
  }
}

export function useVideoEditScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): VideoEditState {
  const form = useAppForm(app, seeds)
  const mode = modeOf(form.values)
  const bodyApp = useMemo(() => bodyAppFor(app, mode), [app, mode])
  const started = useStartRun(bodyApp, form, onStarted)
  const checks = useClip(form, app, mode)
  const focusers = useRef(new Map<string, () => void>())
  const start = useGenerate(form, started, checks, focusers.current)
  const runs = useAppRuns(app)
  return {
    app,
    mode,
    form,
    start,
    ...checks,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    register: (name, focus) => {
      focusers.current.set(name, focus)
      form.register(name, focus)
    },
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}
