import { type AppListing, type Run, routes } from "@rosesfield/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { settingsQuery } from "@/api/queries"
import { formatNumber } from "@/copy/format"
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

export function useStartRun(
  app: AppListing,
  form: AppForm,
  onStarted?: (run: Run) => void,
  hosted?: HostedState
): StartRun {
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const hostedRun = hostedBodyOf(app, form, hosted)
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

export function priceLabelsOf(
  credits: number | null,
  isDemo: boolean
): Pick<StartRun, "price" | "priceValue" | "priceName"> {
  const amount = credits === null ? null : formatNumber(credits)
  return {
    price: isDemo
      ? t("run.price.demo")
      : amount === null
        ? t("run.price.unknown")
        : "",
    priceValue: amount,
    priceName: amount === null ? null : t("run.generate.priced", { amount }),
  }
}
