import type { AppListing, Run } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo } from "react"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { settingsQuery } from "@/api/queries"
import { textOf } from "@/screens/app/fields/field-props"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { ranBeforeOf } from "@/screens/app/hosted/model-sections"
import { taskAppOf } from "@/screens/app/hosted/task-app"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  defaultOfMode,
  inputsForModel,
  type ModelIndex,
  modelIndexOf,
  modelsOfMode,
  runModeOf,
} from "@/studio/layers/layers-models"
import type { LayersMode } from "@/studio/layers/layers-modes"

export type LayersModels = {
  index: ModelIndex
  hosted: HostedState
}

export function ranBeforeIn(runs: readonly Run[], mode: LayersMode): string[] {
  const newest = [...runs].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
  return ranBeforeOf(
    newest
      .filter((run) => runModeOf(run) === mode)
      .map((run) => {
        const model = run.inputs[modelInputName]
        return typeof model === "string" ? model : undefined
      })
  )
}

function errorOf(
  error: Error | null,
  refusal: { code: string; status: number } | null | undefined
): Error | null {
  if (error !== null) {
    return error
  }
  return refusal === null || refusal === undefined
    ? null
    : new GatewayRefusedError({
        code: refusal.code,
        status: refusal.status,
        retryAfterSeconds: null,
      })
}

export function useLayersModels(
  app: AppListing,
  form: AppForm,
  mode: LayersMode
): LayersModels {
  const isTaskApp = useMemo(() => taskAppOf(app.id) !== null, [app.id])
  const settings = useQuery(settingsQuery)
  const keyState = settings.data?.engine.key ?? "unknown"
  const query = useQuery({
    ...modelCatalogQuery(app.id, keyState),
    enabled: isTaskApp,
  })
  const index = useMemo(
    () => modelIndexOf(app, query.data?.models ?? []),
    [app, query.data]
  )
  const models = useMemo(() => modelsOfMode(index, mode), [index, mode])
  const fallback = useMemo(() => defaultOfMode(index, mode), [index, mode])
  const id = textOf(form.values.inputs[modelInputName])
  const chosen = models.find((model) => model.id === id) ?? null
  const { values, setForm } = form
  const choose = useCallback(
    (next: string) => {
      const model = models.find((one) => one.id === next)
      if (model !== undefined) {
        setForm({ inputs: inputsForModel(values.inputs, model) })
      }
    },
    [models, values.inputs, setForm]
  )
  const fallbackId = fallback?.id ?? null
  useEffect(() => {
    if (chosen === null && fallbackId !== null) {
      choose(fallbackId)
    }
  }, [chosen, fallbackId, choose])
  return {
    index,
    hosted: {
      isTaskApp,
      models,
      isLoading: isTaskApp && query.isPending,
      error: errorOf(query.error, query.data?.refusal),
      keyState,
      defaultModel: fallbackId,
      chosen,
      fields: chosen?.form ?? null,
      choose,
    },
  }
}
