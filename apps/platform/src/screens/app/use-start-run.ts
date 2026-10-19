import { type AppListing, type Run, routes } from "@rosesfield/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { storeRun } from "@/pieces/run/run-actions"
import { bodyOf } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"

export type StartRun = {
  generate: () => void
  isPending: boolean
  error: Error | null
  price: string
}

export function useStartRun(
  app: AppListing,
  form: AppForm,
  onStarted?: (run: Run) => void
): StartRun {
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const start = useMutation({
    mutationFn: async (key: string) => {
      const answer = await callRoute(routes.startRun, {
        params: { appId: app.id },
        body: bodyOf(app, form.values),
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
  const isDemo = settings.data?.engine.origin === "demo"
  return {
    generate,
    isPending: start.isPending,
    error: start.error,
    price: isDemo ? t("run.price.demo") : t("run.price.unknown"),
  }
}
