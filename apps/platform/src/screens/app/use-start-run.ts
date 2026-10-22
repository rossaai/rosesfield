import { type AppListing, type Run, routes } from "@rosesfield/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { settingsQuery } from "@/api/queries"
import { formatAmount, formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { storeRun } from "@/pieces/run/run-actions"
import { bodyOf, type StartRunBodyInput } from "@/screens/app/app-form"
import { hostedBody } from "@/screens/app/hosted/hosted-form"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"
import { useDebounced } from "@/screens/app/hosted/use-debounced"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"

export type StartRun = {
  generate: () => void
  isPending: boolean
  error: Error | null
  price: string
  priceValue?: string | null
  priceName?: string | null
}

const priceDelayMs = 300

function hostedBodyOf(
  app: AppListing,
  form: AppForm,
  hosted: HostedState | undefined
): StartRunBodyInput | null {
  const chosen = hosted?.chosen
  return chosen === null || chosen === undefined || chosen.form === null
    ? null
    : hostedBody(chosen.id, chosen.form, form.values, app.output.kind)
}

export function usePrice(
  app: AppListing,
  body: StartRunBodyInput | null,
  keyState: string
): number | null {
  const ask = useDebounced(body, priceDelayMs)
  const query = useQuery({
    ...priceQuery(app.id, ask ?? { inputs: {} }, keyState),
    enabled: ask !== null,
  })
  const price = query.data?.price
  return price === undefined || price.source === "unknown"
    ? null
    : price.credits
}

export type HostedBodyOf = (body: StartRunBodyInput) => StartRunBodyInput

export function useStartRun(
  app: AppListing,
  form: AppForm,
  onStarted?: (run: Run) => void,
  hosted?: HostedState,
  hostedBodyFor?: HostedBodyOf
): StartRun {
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const own = hostedBodyOf(app, form, hosted)
  const hostedRun =
    own === null || hostedBodyFor === undefined ? own : hostedBodyFor(own)
  const isDemo = settings.data?.engine.origin === "demo"
  const credits = usePrice(
    app,
    hostedRun ?? bodyOf(app, form.values),
    hosted?.keyState ?? settings.data?.engine.key ?? "unknown"
  )
  const start = useMutation({
    mutationFn: async (key: string) => {
      const answer = await callRoute(routes.startRun, {
        params: { appId: app.id },
        body: hostedRun ?? bodyOf(app, form.values),
        idempotencyKey: key,
      })
      return answer.run
    },
    onSuccess: (run) => {
      storeRun(client, run)
      onStarted?.(run)
    },
    onError: (error) => form.refuse?.(error),
  })
  const generate = (): void => {
    if (start.isPending || !form.validate()) {
      return
    }
    start.mutate(crypto.randomUUID())
  }
  return {
    generate,
    isPending: start.isPending,
    error: start.error,
    ...priceLabelsOf(credits, isDemo),
  }
}

const smallCredits = 0.01

function creditsText(credits: number): string {
  return credits < smallCredits ? formatAmount(credits) : formatNumber(credits)
}

export function priceLabelsOf(
  credits: number | null,
  isDemo: boolean
): Pick<StartRun, "price" | "priceValue" | "priceName"> {
  const amount = credits === null || credits <= 0 ? null : creditsText(credits)
  return {
    price: isDemo ? t("run.price.demo") : "",
    priceValue: amount,
    priceName: amount === null ? null : t("run.generate.priced", { amount }),
  }
}
