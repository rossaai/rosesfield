import { type HostedRun, hostedRunsOf } from "@rosesfield/catalog/characters"
import type { ModelField } from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  type Character,
  type Run,
  routes,
} from "@rosesfield/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { characterQuery } from "@/api/queries"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { storeRun } from "@/pieces/run/run-actions"
import { bodyOf, type StartRunBodyInput } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import { hostedProblems } from "@/screens/app/hosted/hosted-form"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"
import { useDebounced } from "@/screens/app/hosted/use-debounced"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppScreenState } from "@/screens/app/use-app-screen"
import type { StartRun } from "@/screens/app/use-start-run"
import { characterInput } from "@/studio/characters/mode-listing"

type Started = { body: StartRunBodyInput; key: string }

const priceDelayMs = 300

function useCharacterPhotos(
  hosted: HostedState | undefined,
  state: AppScreenState
): Character["references"] {
  const [characterId] = listOf(state.form.values.inputs[characterInput])
  const isHosted = (hosted?.fields ?? null) !== null
  const found = useQuery({
    ...characterQuery(characterId ?? ""),
    enabled: isHosted && characterId !== undefined,
  })
  return found.data?.character.references ?? []
}

function hostedRunsFor(
  fields: readonly ModelField[],
  state: AppScreenState,
  photos: Character["references"]
): HostedRun[] {
  const { values } = state.form
  return hostedRunsOf(fields, values.inputs, { photos, count: values.count })
}

function isStartable(
  fields: readonly ModelField[],
  state: AppScreenState,
  runs: readonly HostedRun[]
): boolean {
  return (
    runs.length > 0 &&
    runs.every(
      (run) =>
        hostedProblems(fields, { ...state.form.values, inputs: run.inputs })
          .length === 0
    )
  )
}

function useSetPrice(
  app: AppListing,
  runs: readonly HostedRun[] | null,
  keyState: string
): string | null {
  const [first] = runs ?? []
  const isSet = runs !== null && runs.length > 1 && first !== undefined
  const ask = useDebounced(isSet ? first : null, priceDelayMs)
  const query = useQuery({
    ...priceQuery(app.id, ask ?? { inputs: {} }, keyState),
    enabled: ask !== null,
  })
  const price = query.data?.price
  return !isSet || price === undefined || price.source === "unknown"
    ? null
    : formatNumber(price.credits * (runs?.length ?? 1))
}

function pricedStart(
  start: StartRun,
  amount: string | null,
  isSet: boolean
): Pick<StartRun, "price" | "priceValue" | "priceName"> {
  if (!isSet) {
    return {
      price: start.price,
      priceValue: start.priceValue ?? null,
      priceName: start.priceName ?? null,
    }
  }
  return amount === null
    ? { price: t("run.price.unknown"), priceValue: null, priceName: null }
    : {
        price: "",
        priceValue: amount,
        priceName: t("run.generate.priced", { amount }),
      }
}

export function useCharactersStart(
  app: AppListing,
  state: AppScreenState,
  hosted: HostedState | undefined,
  onStarted: (run: Run) => void
): StartRun {
  const client = useQueryClient()
  const photos = useCharacterPhotos(hosted, state)
  const fields = hosted?.fields ?? null
  const runs = fields === null ? null : hostedRunsFor(fields, state, photos)
  const isSet = runs !== null && runs.length > 1
  const amount = useSetPrice(app, runs, hosted?.keyState ?? "unknown")
  const start = useMutation({
    mutationFn: (started: readonly Started[]) =>
      Promise.all(
        started.map(
          async ({ body, key }) =>
            (
              await callRoute(routes.startRun, {
                params: { appId: app.id },
                body,
                idempotencyKey: key,
              })
            ).run
        )
      ),
    onSuccess: (made) => {
      for (const run of made) {
        storeRun(client, run)
      }
      const [first] = made
      if (first !== undefined) {
        onStarted(first)
      }
    },
  })
  const generate = (): void => {
    if (start.isPending) {
      return
    }
    if (fields === null || runs === null) {
      if (state.form.validate()) {
        const body = bodyOf(app, state.form.values)
        start.mutate([{ body, key: crypto.randomUUID() }])
      }
      return
    }
    if (!isStartable(fields, state, runs)) {
      state.form.validate()
      return
    }
    start.mutate(runs.map((body) => ({ body, key: crypto.randomUUID() })))
  }
  return {
    ...pricedStart(state.start, amount, isSet),
    generate,
    isPending: start.isPending,
    error: start.error,
  }
}
