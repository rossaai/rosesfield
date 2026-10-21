import {
  anglesGapOf,
  type HostedRun,
  hostedRunsOf,
  type Mode,
} from "@rosesfield/catalog/characters"
import type { ModelField } from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  type Character,
  type Run,
  routes,
} from "@rosesfield/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
import { callRoute } from "@/api/call-route"
import { characterQuery, settingsQuery } from "@/api/queries"
import { storeRun } from "@/pieces/run/run-actions"
import {
  bodyOf,
  type FieldProblem,
  type FormValues,
  heldProblemsOf,
  type StartRunBodyInput,
} from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import { hostedProblems } from "@/screens/app/hosted/hosted-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm, FormCheck } from "@/screens/app/use-app-form"
import {
  priceLabelsOf,
  type StartRun,
  usePrice,
} from "@/screens/app/use-start-run"
import { characterInput, modeField } from "@/studio/characters/mode-listing"

export type CharactersStart = StartRun & { check: FormCheck }

type Photos = { photos: Character["references"]; isLoading: boolean }

type Press = { signature: string; key: string }

const viewKey = "-view-"

function useCharacterPhotos(
  fields: readonly ModelField[] | null,
  form: AppForm,
  mode: Mode
): Photos {
  const [characterId] = listOf(form.values.inputs[characterInput])
  const isAsked =
    fields !== null && mode === "angles" && characterId !== undefined
  const found = useQuery({
    ...characterQuery(characterId ?? ""),
    enabled: isAsked,
  })
  return {
    photos: found.data?.character.references ?? [],
    isLoading: isAsked && found.isPending,
  }
}

type ModeRuns = {
  fields: readonly ModelField[] | null
  mode: Mode
  photos: Character["references"]
}

function runsOf(values: FormValues, of: ModeRuns): HostedRun[] | null {
  if (of.fields === null) {
    return null
  }
  const inputs = { ...values.inputs, [modeField]: of.mode }
  return hostedRunsOf(of.fields, inputs, {
    photos: of.photos,
    count: values.count,
  })
}

function problem(name: string, key: FieldProblem["key"]): FieldProblem {
  return { name, key, values: {} }
}

function runProblems(
  fields: readonly ModelField[],
  values: FormValues,
  runs: readonly HostedRun[]
): FieldProblem[] {
  return runs.flatMap((run) =>
    hostedProblems(fields, { ...values, inputs: run.inputs })
  )
}

function anglesProblems(
  fields: readonly ModelField[],
  photos: Character["references"]
): FieldProblem[] {
  return anglesGapOf(fields, photos) === "character"
    ? [problem(characterInput, "field.character.required")]
    : []
}

function checkOf(app: AppListing, of: ModeRuns): FormCheck {
  const { fields } = of
  if (fields === null) {
    return (values) => heldProblemsOf(app, values)
  }
  return (values) => {
    const runs = runsOf(values, of) ?? []
    const gaps = of.mode === "angles" ? anglesProblems(fields, of.photos) : []
    return gaps.length > 0 ? gaps : runProblems(fields, values, runs)
  }
}

function keyOf(press: Press, index: number, total: number): string {
  return total === 1 ? press.key : `${press.key}${viewKey}${index + 1}`
}

function useCharactersStart(
  app: AppListing,
  form: AppForm,
  hosted: HostedState,
  mode: Mode,
  onStarted?: (run: Run) => void
): CharactersStart {
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const fields = hosted.fields
  const { photos, isLoading } = useCharacterPhotos(fields, form, mode)
  const of: ModeRuns = { fields, mode, photos }
  const runs = runsOf(form.values, of)
  const bodies: readonly StartRunBodyInput[] = runs ?? [
    bodyOf(app, form.values),
  ]
  const [first] = bodies
  const credits = usePrice(
    app,
    first ?? null,
    hosted.keyState
  )
  const pressed = useRef<Press | null>(null)
  const start = useMutation({
    mutationFn: async (press: {
      key: Press
      bodies: readonly StartRunBodyInput[]
    }) => {
      let isFirst = true
      const made = await Promise.all(
        press.bodies.map(async (body, index) => {
          const { run } = await callRoute(routes.startRun, {
            params: { appId: app.id },
            body,
            idempotencyKey: keyOf(press.key, index, press.bodies.length),
          })
          storeRun(client, run)
          if (isFirst) {
            isFirst = false
            onStarted?.(run)
          }
          return run
        })
      )
      if (pressed.current === press.key) {
        pressed.current = null
      }
      return made
    },
  })
  const pressOf = (sent: readonly StartRunBodyInput[]): Press => {
    const signature = JSON.stringify(sent)
    if (pressed.current?.signature !== signature) {
      pressed.current = { signature, key: crypto.randomUUID() }
    }
    return pressed.current
  }
  const generate = (): void => {
    if (start.isPending || isLoading) {
      return
    }
    if (fields === null || runs === null) {
      if (form.validate()) {
        start.mutate({ key: pressOf(bodies), bodies })
      }
      return
    }
    const problems = runProblems(fields, form.values, runs)
    if (runs.length === 0 || problems.length > 0) {
      form.validate()
      return
    }
    start.mutate({ key: pressOf(bodies), bodies })
  }
  const total = credits === null ? null : credits * bodies.length
  return {
    ...priceLabelsOf(total, settings.data?.engine.origin === "demo"),
    generate,
    isPending: start.isPending || isLoading,
    error: start.error,
    check: checkOf(app, of),
  }
}

export function useTraitsStart(
  app: AppListing,
  form: AppForm,
  hosted: HostedState,
  onStarted?: (run: Run) => void
): CharactersStart {
  return useCharactersStart(app, form, hosted, "traits", onStarted)
}

export function useAnglesStart(
  app: AppListing,
  form: AppForm,
  hosted: HostedState,
  onStarted?: (run: Run) => void
): CharactersStart {
  return useCharactersStart(app, form, hosted, "angles", onStarted)
}
