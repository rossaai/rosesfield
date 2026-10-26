import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { settingsQuery } from "@/api/queries"
import { bodyOf, defaultsOf, type FormValues } from "@/screens/app/app-form"
import { textOf } from "@/screens/app/fields/field-props"
import {
  appMediaFieldsOf,
  type HeldMedia,
  heldMediaOf,
  hostedBody,
  hostedDefaults,
  missingDefaultsOf,
  modelInputName,
  placedMedia,
  settingsFor,
} from "@/screens/app/hosted/hosted-form"
import {
  modelCatalogQuery,
  type PriceAsk,
} from "@/screens/app/hosted/model-catalog-query"
import { rankedCatalogOf } from "@/screens/app/hosted/model-sections"
import { taskAppOf } from "@/screens/app/hosted/task-app"
import type { AppForm } from "@/screens/app/use-app-form"

export type RowPricing = {
  appId: string
  askOf: (model: CatalogModel) => PriceAsk
}

export type HostedState = {
  isTaskApp: boolean
  models: readonly CatalogModel[]
  isLoading: boolean
  error: Error | null
  keyState: string
  defaultModel: string | null
  chosen: CatalogModel | null
  fields: readonly ModelField[] | null
  choose: (id: string) => void
  pricing?: RowPricing
}

export function priceAskOf(
  app: AppListing,
  values: FormValues,
  model: CatalogModel
): PriceAsk {
  if (model.form === null) {
    return bodyOf(app, {
      ...values,
      inputs: { ...values.inputs, [modelInputName]: model.id },
    })
  }
  const inputs = settingsFor(model.form, values.inputs)
  return hostedBody(
    model.id,
    model.form,
    { ...values, inputs },
    app.output.kind
  )
}

function useRowPricing(app: AppListing, values: FormValues): RowPricing {
  return useMemo(
    () => ({
      appId: app.id,
      askOf: (model: CatalogModel) => priceAskOf(app, values, model),
    }),
    [app, values]
  )
}

function useChoose(
  app: AppListing,
  form: AppForm,
  models: readonly CatalogModel[],
  chosen: CatalogModel | null
): (id: string) => void {
  const { values, setForm } = form
  const held = useRef<HeldMedia>({})
  return useCallback(
    (id: string) => {
      const next = models.find((model) => model.id === id)
      const kept = values.inputs
      const output = app.output.kind
      const media = heldMediaOf(
        chosen?.form ?? appMediaFieldsOf(app),
        kept,
        held.current,
        output
      )
      held.current = media
      const inputs =
        next?.form === null || next?.form === undefined
          ? { ...defaultsOf(app).inputs, prompt: kept.prompt }
          : hostedDefaults(next.form, kept)
      const placed = placedMedia(
        next?.form ?? appMediaFieldsOf(app),
        media,
        kept,
        output
      )
      setForm({ inputs: { ...inputs, ...placed, [modelInputName]: id } })
    },
    [app, chosen, models, values.inputs, setForm]
  )
}

export function useHostedModel(app: AppListing, form: AppForm): HostedState {
  const taskApp = useMemo(() => taskAppOf(app.id), [app.id])
  const settings = useQuery(settingsQuery)
  const keyState = settings.data?.engine.key ?? "unknown"
  const query = useQuery({
    ...modelCatalogQuery(app.id, keyState),
    enabled: taskApp !== null,
  })
  const models = query.data?.models ?? []
  const declared = query.data?.defaultModel ?? taskApp?.defaultModel ?? null
  const defaultModel = rankedCatalogOf(declared, models)[0] ?? declared
  const chosenId = textOf(form.values.inputs[modelInputName]) || defaultModel
  const chosen = models.find((model) => model.id === chosenId) ?? null
  const { values } = form
  const choose = useChoose(app, form, models, chosen)
  useOpenOnDefault(
    app,
    form,
    { model: defaultModel, own: taskApp?.defaultModel ?? null },
    models,
    choose
  )
  useOpenDefaults(chosen?.form ?? null, form)
  const refusal = query.data?.refusal ?? null
  const pricing = useRowPricing(app, values)
  return {
    isTaskApp: taskApp !== null,
    models,
    isLoading: taskApp !== null && query.isPending,
    error:
      query.error ??
      (refusal === null
        ? null
        : new GatewayRefusedError({ ...refusal, retryAfterSeconds: null })),
    keyState,
    defaultModel,
    chosen,
    fields: chosen?.form ?? null,
    choose,
    pricing,
  }
}

function useOpenDefaults(
  fields: readonly ModelField[] | null,
  form: AppForm
): void {
  const { values, setInput } = form
  useEffect(() => {
    if (fields === null) {
      return
    }
    for (const [name, value] of Object.entries(
      missingDefaultsOf(fields, values.inputs)
    )) {
      setInput(name, value)
    }
  }, [fields, values.inputs, setInput])
}

type Defaults = { model: string | null; own: string | null }

function useOpenOnDefault(
  app: AppListing,
  form: AppForm,
  defaults: Defaults,
  models: readonly CatalogModel[],
  choose: (id: string) => void
): void {
  const opened = useRef(false)
  const value = textOf(form.values.inputs[modelInputName])
  const appDefault = textOf(defaultsOf(app).inputs[modelInputName])
  const source = form.source ?? "defaults"
  const { model: defaultModel, own } = defaults
  useEffect(() => {
    if (opened.current || defaultModel === null || models.length === 0) {
      return
    }
    opened.current = true
    if (
      source === "defaults" &&
      value === appDefault &&
      appDefault === own &&
      value !== defaultModel
    ) {
      choose(defaultModel)
    }
  }, [defaultModel, own, models, value, appDefault, choose, source])
}
