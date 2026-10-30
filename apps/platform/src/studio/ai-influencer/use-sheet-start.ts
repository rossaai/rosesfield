import {
  sheetHostedInputs,
  withSheetPrompt,
} from "@rosesfield/catalog/ai-influencer"
import type { AppListing, Run } from "@rosesfield/contract"
import { useMemo } from "react"
import { type FormValues, heldProblemsOf } from "@/screens/app/app-form"
import { hostedProblems } from "@/screens/app/hosted/hosted-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm, FormCheck } from "@/screens/app/use-app-form"
import type { ScreenStart } from "@/screens/app/use-app-screen"
import { useStartRun } from "@/screens/app/use-start-run"

function sheetValues(values: FormValues): FormValues {
  return { ...values, inputs: withSheetPrompt(values.inputs) }
}

function checkOf(app: AppListing, hosted: HostedState): FormCheck {
  const fields = hosted.fields
  return (values) =>
    fields === null
      ? heldProblemsOf(app, sheetValues(values))
      : hostedProblems(fields, {
          ...values,
          inputs: {
            ...values.inputs,
            ...sheetHostedInputs(fields, values.inputs),
          },
        })
}

/** Starts one run whose prompt the picked traits compose, on the app's own graphs or on a hosted model. */
export function useSheetStart(
  app: AppListing,
  form: AppForm,
  hosted: HostedState,
  onStarted?: (run: Run) => void
): ScreenStart {
  const values = useMemo(() => sheetValues(form.values), [form.values])
  const sheetForm = useMemo(() => ({ ...form, values }), [form, values])
  const fields = hosted.fields
  const start = useStartRun(app, sheetForm, onStarted, hosted, (body) =>
    fields === null
      ? body
      : {
          ...body,
          inputs: {
            ...body.inputs,
            ...sheetHostedInputs(fields, form.values.inputs),
          },
        }
  )
  return { ...start, check: checkOf(app, hosted) }
}
