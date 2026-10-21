import { type AppListing, type Run, routes } from "@rosesfield/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { settingsQuery } from "@/api/queries"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { storeRun } from "@/pieces/run/run-actions"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"
import { useDebounced } from "@/screens/app/hosted/use-debounced"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import { scenesOf } from "@/studio/storyboard/storyboard-form"
import {
  keyframeBody,
  keyframesCredits,
  storyboardBody,
} from "@/studio/storyboard/storyboard-model"

const priceDelayMs = 300

function useKeyframesPrice(
  app: AppListing,
  form: AppForm,
  model: HostedState
): number | null {
  const ask = useDebounced(
    keyframeBody(app, form.values, model.chosen),
    priceDelayMs
  )
  const query = useQuery(priceQuery(app.id, ask, model.keyState))
  return keyframesCredits(query.data?.price, scenesOf(form.values).length)
}

export function priceCaptionOf(start: StartRun): string {
  const amount = start.priceValue ?? null
  return amount === null ? start.price : t("run.price.credits", { amount })
}

export function useStoryboardStart(
  app: AppListing,
  form: AppForm,
  model: HostedState,
  onStarted: (run: Run) => void
): StartRun {
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const isDemo = settings.data?.engine.origin === "demo"
  const credits = useKeyframesPrice(app, form, model)
  const start = useMutation({
    mutationFn: async (key: string) => {
      const answer = await callRoute(routes.startRun, {
        params: { appId: app.id },
        body: storyboardBody(app, form.values, model.chosen),
        idempotencyKey: key,
      })
      return answer.run
    },
    onSuccess: (run) => {
      storeRun(client, run)
      onStarted(run)
    },
  })
  const amount = isDemo || credits === null ? null : formatNumber(credits)
  return {
    generate: () => {
      if (!start.isPending) {
        start.mutate(crypto.randomUUID())
      }
    },
    isPending: start.isPending,
    error: start.error,
    price: isDemo
      ? t("run.price.demo")
      : amount === null
        ? t("run.price.unknown")
        : "",
    priceValue: amount,
    priceName: amount === null ? null : t("run.generate.priced", { amount }),
  }
}
