import type { AppListing, Run } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { type KeyboardEvent, useEffect, useRef } from "react"
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
  nearestRatio,
  useClipFacts,
} from "@/studio/recast/use-clip-facts"
import {
  editLengthOf,
  remakeLimits,
} from "../../../../../packages/catalog/src/remake/shot-plan"

export const referenceInput = "reference"
export const characterInput = "character"

export type RemakeState = {
  app: AppListing
  form: AppForm
  start: StartRun
  reference: ClipFacts | null
  referenceProblem: FieldProblem | undefined
  lastSeed: number | null
  hasRuns: boolean | null
  useInputs: (run: Run) => void
  registerReference: (focus: () => void) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

export function problemOf(
  reference: Pick<ClipFacts, "seconds"> | null,
  bytes: number | null
): FieldProblem | undefined {
  if (bytes !== null && bytes > remakeLimits.largestEditBytes) {
    return {
      name: referenceInput,
      key: "field.asset.tooLarge",
      values: {
        size: formatBytes(bytes),
        limit: formatBytes(remakeLimits.largestEditBytes),
      },
    }
  }
  if (reference === null) {
    return undefined
  }
  const length = editLengthOf(reference.seconds)
  if (length === "short") {
    return {
      name: referenceInput,
      key: "field.asset.tooShort",
      values: {
        seconds: formatSeconds(Math.floor(reference.seconds * 10) / 10),
        min: remakeLimits.shortestEditSeconds,
      },
    }
  }
  if (length === "long") {
    return {
      name: referenceInput,
      key: "field.asset.tooLong",
      values: {
        seconds: formatSeconds(Math.ceil(reference.seconds * 10) / 10),
        max: remakeLimits.longestEditSeconds,
      },
    }
  }
  return undefined
}

function useReference(form: AppForm, app: AppListing) {
  const [first = null] = listOf(form.values.inputs[referenceInput])
  const reference = useClipFacts(first)
  const asset = useQuery({
    ...assetQuery(first ?? ""),
    enabled: first !== null,
  })
  const bytes = first === null ? null : (asset.data?.asset.bytes ?? null)
  const { setForm } = form
  const options =
    app.output.kind === "video" ? app.output.aspectRatios.options : []
  const ratio = reference === null ? null : nearestRatio(reference, options)
  const current = form.values.aspectRatio
  useEffect(() => {
    if (ratio !== null && ratio !== current) {
      setForm({ aspectRatio: ratio })
    }
  }, [ratio, current, setForm])
  return { reference, referenceProblem: problemOf(reference, bytes) }
}

export function useRemakeScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): RemakeState {
  const form = useAppForm(app, seeds)
  const started = useStartRun(app, form, onStarted)
  const { reference, referenceProblem } = useReference(form, app)
  const focusReference = useRef<() => void>(() => undefined)
  const start: StartRun = {
    ...started,
    generate: () => {
      const isFormValid = form.validate()
      if (referenceProblem !== undefined) {
        if (isFormValid) {
          focusReference.current()
        }
        return
      }
      if (isFormValid) {
        started.generate()
      }
    },
  }
  const runs = useAppRuns(app)
  return {
    app,
    form,
    start,
    reference,
    referenceProblem,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    registerReference: (focus) => {
      focusReference.current = focus
    },
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}
