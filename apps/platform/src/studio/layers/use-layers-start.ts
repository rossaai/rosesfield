import { type AppListing, type Run, routes } from "@rosesfield/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { settingsQuery } from "@/api/queries"
import { uploadAsset } from "@/api/upload-asset"
import { t } from "@/copy/t"
import { storeRun } from "@/pieces/run/run-actions"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
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

export function useLayersStart(options: LayersStartOptions): StartRun {
  const { app, mode, form } = options
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const start = useMutation({
    mutationFn: async (key: string) => {
      const body = layersBodyOf(app, mode, form.values)
      const inputs =
        mode === "fill"
          ? { ...body.inputs, [maskInput]: await maskAssetOf(options.mask()) }
          : body.inputs
      const answer = await callRoute(routes.startRun, {
        params: { appId: app.id },
        body: { ...body, inputs },
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
  return {
    generate,
    isPending: start.isPending,
    error: start.error,
    price: isDemo ? t("run.price.demo") : t("run.price.unknown"),
  }
}
