import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing, Run } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { settingsQuery } from "@/api/queries"
import { defaultsOf } from "@/screens/app/app-form"
import { textOf } from "@/screens/app/fields/field-props"
import {
  hostedDefaults,
  modelInputName,
} from "@/screens/app/hosted/hosted-form"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { ranBeforeOf } from "@/screens/app/hosted/model-sections"
import { taskAppOf } from "@/screens/app/hosted/task-app"
import type { AppForm } from "@/screens/app/use-app-form"

export type HostedState = {
  isTaskApp: boolean
  models: readonly CatalogModel[]
  isLoading: boolean
  error: Error | null
  keyState: string
  defaultModel: string | null
  chosen: CatalogModel | null
  fields: readonly ModelField[] | null
  ranBefore: readonly string[]
  choose: (id: string) => void
}

function newestFirst(runs: readonly Run[]): Run[] {
  return [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function useHostedModel(
  app: AppListing,
  form: AppForm,
  runs: readonly Run[]
): HostedState {
  const taskApp = useMemo(() => taskAppOf(app.id), [app.id])
  const settings = useQuery(settingsQuery)
  const keyState = settings.data?.engine.key ?? "unknown"
  const query = useQuery({
    ...modelCatalogQuery(app.id, keyState),
    enabled: taskApp !== null,
  })
  const models = query.data?.models ?? []
  const defaultModel = query.data?.defaultModel ?? taskApp?.defaultModel ?? null
  const chosenId = textOf(form.values.inputs[modelInputName]) || defaultModel
  const chosen = models.find((model) => model.id === chosenId) ?? null
  const { values, setForm } = form
  const choose = useCallback(
    (id: string) => {
      const next = models.find((model) => model.id === id)
      const kept = values.inputs
      const inputs =
        next?.form === null || next?.form === undefined
          ? { ...defaultsOf(app).inputs, prompt: kept.prompt }
          : hostedDefaults(next.form, kept)
      setForm({ inputs: { ...inputs, [modelInputName]: id } })
    },
    [app, models, values.inputs, setForm]
  )
  useOpenOnDefault(app, form, defaultModel, models, choose)
  return {
    isTaskApp: taskApp !== null,
    models,
    isLoading: taskApp !== null && query.isPending,
    error: query.error,
    keyState,
    defaultModel,
    chosen,
    fields: chosen?.form ?? null,
    ranBefore: ranBeforeOf(
      newestFirst(runs).map((run) => {
        const model = run.inputs[modelInputName]
        return typeof model === "string" ? model : undefined
      })
    ),
    choose,
  }
}

function useOpenOnDefault(
  app: AppListing,
  form: AppForm,
  defaultModel: string | null,
  models: readonly CatalogModel[],
  choose: (id: string) => void
): void {
  const opened = useRef(false)
  const value = textOf(form.values.inputs[modelInputName])
  const appDefault = textOf(defaultsOf(app).inputs[modelInputName])
  useEffect(() => {
    if (opened.current || defaultModel === null || models.length === 0) {
      return
    }
    opened.current = true
    if (value === appDefault && value !== defaultModel) {
      choose(defaultModel)
    }
  }, [defaultModel, models, value, appDefault, choose])
}
