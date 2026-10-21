import type { AppListing, Run } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { settingsQuery } from "@/api/queries"
import { textOf } from "@/screens/app/fields/field-props"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { ranBeforeOf } from "@/screens/app/hosted/model-sections"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  chosenModelOf,
  inputsForModel,
} from "@/studio/storyboard/storyboard-model"

function modelsRun(runs: readonly Run[]): (string | undefined)[] {
  return [...runs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((run) => {
      const model = run.inputs[modelInputName]
      return typeof model === "string" ? model : undefined
    })
}

export function useStoryboardModel(
  app: AppListing,
  form: AppForm,
  runs: readonly Run[]
): HostedState {
  const settings = useQuery(settingsQuery)
  const keyState = settings.data?.engine.key ?? "unknown"
  const query = useQuery(modelCatalogQuery(app.id, keyState))
  const models = query.data?.models ?? []
  const defaultModel = query.data?.defaultModel ?? null
  const chosen = chosenModelOf(
    models,
    textOf(form.values.inputs[modelInputName]),
    defaultModel
  )
  const refusal = query.data?.refusal ?? null
  return {
    isTaskApp: models.length > 0,
    models,
    isLoading: query.isPending,
    error:
      query.error ??
      (refusal === null
        ? null
        : new GatewayRefusedError({ ...refusal, retryAfterSeconds: null })),
    keyState,
    defaultModel,
    chosen,
    fields: chosen?.form ?? null,
    ranBefore: ranBeforeOf(modelsRun(runs)),
    choose: (id) => {
      const next = models.find((model) => model.id === id)
      if (next !== undefined) {
        form.setForm({ inputs: inputsForModel(form.values.inputs, next) })
      }
    },
  }
}
