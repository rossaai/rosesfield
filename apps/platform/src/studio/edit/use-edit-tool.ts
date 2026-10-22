import { type AppListing, fixedCountOf } from "@rosesfield/contract"
import { useEffect, useMemo, useRef } from "react"
import { useAppRuns } from "@/screens/app/app-canvas"
import { heldProblemsOf, valuesFromRun } from "@/screens/app/app-form"
import { hostedProblems } from "@/screens/app/hosted/hosted-form"
import { useHostedModel } from "@/screens/app/hosted/use-hosted-model"
import { usePriceRefresh } from "@/screens/app/hosted/use-price-refresh"
import {
  type AppForm,
  type FormCheck,
  useAppForm,
} from "@/screens/app/use-app-form"
import type { AppScreenState, AppSeeds } from "@/screens/app/use-app-screen"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import {
  appliedApp,
  chipNamesOf,
  imageSlotsOf,
  ratioFor,
} from "@/studio/edit/edit-form"
import type { EditTool } from "@/studio/edit/edit-tools"
import { type EditPhoto, useEditPhoto } from "@/studio/edit/use-edit-photo"

export type EditToolState = AppScreenState & {
  tool: EditTool
  app: AppListing
  photo: EditPhoto
  chips: string[]
}

function useOutputShape(
  tool: EditTool,
  app: AppListing,
  form: AppForm,
  photo: EditPhoto
): void {
  const { setForm } = form
  const inputs = form.values.inputs
  const count = fixedCountOf(app, inputs)
  const currentCount = form.values.count
  const size = photo.reading.state === "read" ? photo.reading.facts.size : null
  const ratio = ratioFor(tool, app, inputs, size)
  const currentRatio = form.values.aspectRatio
  useEffect(() => {
    if (count !== null && count !== currentCount) {
      setForm({ count })
    }
  }, [count, currentCount, setForm])
  useEffect(() => {
    if (ratio !== null && ratio !== currentRatio) {
      setForm({ aspectRatio: ratio })
    }
  }, [ratio, currentRatio, setForm])
}

function checkedStart(start: StartRun, photo: EditPhoto): StartRun {
  const isReading = photo.reading.state === "reading"
  return {
    ...start,
    isPending: start.isPending || isReading,
    generate: () => {
      if (!photo.isRefused && !isReading) {
        start.generate()
      }
    },
  }
}

export function useEditTool(
  tool: EditTool,
  app: AppListing,
  seeds: AppSeeds
): EditToolState {
  const check = useRef<FormCheck | null>(null)
  const form = useAppForm(app, seeds, check)
  const runs = useAppRuns(app)
  const hosted = useHostedModel(app, form, runs.runs)
  usePriceRefresh(app.id, runs.runs)
  const fields = hosted.fields
  const inputs = form.values.inputs
  const bodyApp = useMemo(() => appliedApp(app, inputs), [app, inputs])
  check.current =
    fields === null
      ? (values) => heldProblemsOf(app, values)
      : (values) => hostedProblems(fields, values)
  const photo = useEditPhoto(
    form,
    imageSlotsOf(app, fields, inputs),
    seeds.use ?? null
  )
  useOutputShape(tool, app, form, photo)
  const start = useStartRun(bodyApp, form, undefined, hosted)
  const guarded = checkedStart(start, photo)
  return {
    tool,
    app,
    form,
    start: guarded,
    hosted,
    photo,
    chips: fields === null ? chipNamesOf(app, inputs) : [],
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        guarded.generate()
      }
    },
  }
}
