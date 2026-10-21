import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { type AppListing, type Run, routes } from "@rosesfield/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { settingsQuery } from "@/api/queries"
import { uploadAsset } from "@/api/upload-asset"
import { storeRun } from "@/pieces/run/run-actions"
import type { FormValues, StartRunBodyInput } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  priceLabelsOf,
  type StartRun,
  usePrice,
} from "@/screens/app/use-start-run"
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

export function useLayersStart(options: LayersStartOptions): StartRun {
  const { app, mode, form, chosen } = options
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const credits = usePrice(
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
  return {
    generate,
    isPending: start.isPending,
    error: start.error,
    ...priceLabelsOf(credits, settings.data?.engine.origin === "demo"),
  }
}
