import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { type AppListing, type Run, routes } from "@rosesfield/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { settingsQuery } from "@/api/queries"
import { uploadAsset } from "@/api/upload-asset"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { storeRun } from "@/pieces/run/run-actions"
import type { FormValues, StartRunBodyInput } from "@/screens/app/app-form"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"
import { useDebounced } from "@/screens/app/hosted/use-debounced"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import { hostedLayersBody, isGraphModel } from "@/studio/layers/layers-models"
import {
  type LayersMode,
  layersBodyOf,
  maskInput,
} from "@/studio/layers/layers-modes"
import { maskPngOf, type PixelSize } from "@/studio/layers/stack-images"

type LayersStartOptions = {
  app: AppListing
  mode: LayersMode
  form: AppForm
  chosen: CatalogModel | null
  keyState: string
  mask: () => { canvas: HTMLCanvasElement; size: PixelSize } | null
  check: () => boolean
  onStarted: (run: Run) => void
}

const priceDelayMs = 300

async function maskAssetOf(
  mask: { canvas: HTMLCanvasElement; size: PixelSize } | null
): Promise<string[]> {
  if (mask === null) {
    return []
  }
  const file = await maskPngOf(mask.canvas, mask.size)
  const asset = await uploadAsset({ file, onProgress: () => undefined })
  return [asset.id]
}

export function layersRunBody(options: {
  app: AppListing
  mode: LayersMode
  values: FormValues
  chosen: CatalogModel | null
  mask: readonly string[]
}): StartRunBodyInput {
  const { app, mode, values, chosen, mask } = options
  if (chosen !== null && !isGraphModel(chosen)) {
    return hostedLayersBody(chosen, values, mode, mask)
  }
  const body = layersBodyOf(app, mode, values)
  return mode === "fill"
    ? { ...body, inputs: { ...body.inputs, [maskInput]: [...mask] } }
    : body
}

function useLayersPrice(
  app: AppListing,
  body: StartRunBodyInput,
  keyState: string
): number | null {
  const ask = useDebounced(body, priceDelayMs)
  const query = useQuery(priceQuery(app.id, ask, keyState))
  const price = query.data?.price
  return price === undefined || price.source === "unknown"
    ? null
    : price.credits
}

export function useLayersStart(options: LayersStartOptions): StartRun {
  const { app, mode, form, chosen } = options
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const credits = useLayersPrice(
    app,
    layersRunBody({ app, mode, values: form.values, chosen, mask: [] }),
    options.keyState
  )
  const start = useMutation({
    mutationFn: async (key: string) => {
      const mask = mode === "fill" ? await maskAssetOf(options.mask()) : []
      const answer = await callRoute(routes.startRun, {
        params: { appId: app.id },
        body: layersRunBody({ app, mode, values: form.values, chosen, mask }),
        idempotencyKey: key,
      })
      return answer.run
    },
    onSuccess: (run) => {
      storeRun(client, run)
      options.onStarted(run)
    },
  })
  const generate = (): void => {
    if (start.isPending) {
      return
    }
    const isFormValid = form.validate()
    const isChecked = options.check()
    if (isFormValid && isChecked) {
      start.mutate(crypto.randomUUID())
    }
  }
  const isDemo = settings.data?.engine.origin === "demo"
  const amount = credits === null ? null : formatNumber(credits)
  return {
    generate,
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
