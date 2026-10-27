import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { type RefObject, useCallback, useEffect, useMemo, useRef } from "react"
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
  keepLastUsed,
  type LastUsed,
  lastUsedOf,
  readLastUsed,
  settingsOf,
} from "@/screens/app/hosted/last-used"
import {
  modelCatalogQuery,
  type PriceAsk,
} from "@/screens/app/hosted/model-catalog-query"
import { defaultIdOf } from "@/screens/app/hosted/model-sections"
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

type ChooseWith = (id: string, used: LastUsed | null) => void

function useChoose(
  app: AppListing,
  form: AppForm,
  models: readonly CatalogModel[],
  chosen: CatalogModel | null
): ChooseWith {
  const { values, setForm } = form
  const held = useRef<HeldMedia>({})
  return useCallback(
    (id: string, used: LastUsed | null) => {
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
          : settingsFor(next.form, {
              ...hostedDefaults(next.form, kept),
              ...settingsOf(next.form, used?.settings ?? {}),
            })
      const placed = placedMedia(
        next?.form ?? appMediaFieldsOf(app),
        media,
        kept,
        output
      )
      setForm({
        inputs: { ...inputs, ...placed, [modelInputName]: id },
        ...(used?.count === undefined ? {} : { count: used.count }),
        ...(used?.aspectRatio === undefined
          ? {}
          : { aspectRatio: used.aspectRatio }),
      })
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
  const defaultModel = defaultIdOf(models)
  const chosenId = textOf(form.values.inputs[modelInputName]) || defaultModel
  const chosen = models.find((model) => model.id === chosenId) ?? null
  const { values } = form
  const chooseWith = useChoose(app, form, models, chosen)
  const choose = useCallback((id: string) => chooseWith(id, null), [chooseWith])
  useLastUsed(
    app,
    form,
    { defaultModel, own: taskApp?.defaultModel ?? null, chosen, models },
    chooseWith
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

type Opening = {
  defaultModel: string | null
  own: string | null
  chosen: CatalogModel | null
  models: readonly CatalogModel[]
}

type Moves = {
  opened: RefObject<boolean>
  moving: RefObject<FormValues | null>
}

function useOpenOnLastUsed(
  app: AppListing,
  form: AppForm,
  openingOf: Opening,
  chooseWith: ChooseWith,
  moves: Moves
): void {
  const kept = useRef(readLastUsed(app.id))
  const { values } = form
  const value = textOf(values.inputs[modelInputName])
  const appDefault = textOf(defaultsOf(app).inputs[modelInputName])
  const source = form.source ?? "defaults"
  const { defaultModel, own, models } = openingOf
  const { opened, moving } = moves
  useEffect(() => {
    if (opened.current || defaultModel === null || models.length === 0) {
      return
    }
    opened.current = true
    if (appDefault !== own || source !== "defaults" || value !== appDefault) {
      return
    }
    const last = kept.current
    const target = models.some((model) => model.id === last?.model)
      ? last
      : null
    const id = target?.model ?? defaultModel
    if (target !== null || value !== id) {
      moving.current = values
      chooseWith(id, target)
    }
  }, [
    defaultModel,
    own,
    models,
    values,
    value,
    appDefault,
    chooseWith,
    source,
    opened,
    moving,
  ])
}

function useKeepLastUsed(
  app: AppListing,
  values: FormValues,
  openingOf: Opening,
  moves: Moves
): void {
  const opening = useRef<string | null>(null)
  const { chosen, own } = openingOf
  const isMain = textOf(defaultsOf(app).inputs[modelInputName]) === own
  const { opened, moving } = moves
  useEffect(() => {
    if (!opened.current || !isMain || chosen === null) {
      return
    }
    if (moving.current === values) {
      return
    }
    moving.current = null
    const inputs = {
      ...missingDefaultsOf(chosen.form ?? [], values.inputs),
      ...values.inputs,
    }
    const used = lastUsedOf(chosen, { ...values, inputs })
    const key = JSON.stringify(used)
    if (opening.current === null) {
      opening.current = key
    } else if (opening.current === "" || key !== opening.current) {
      opening.current = ""
      keepLastUsed(app.id, used)
    }
  }, [app.id, isMain, chosen, values, opened, moving])
}

/** Opens an untouched form on the model and settings you last used in the app, else on its #1, and keeps the model and settings once you change them. Only the app's main form reads and keeps them, never a mode with a model default of its own. */
function useLastUsed(
  app: AppListing,
  form: AppForm,
  openingOf: Opening,
  chooseWith: ChooseWith
): void {
  const moves = {
    opened: useRef(false),
    moving: useRef<FormValues | null>(null),
  }
  useOpenOnLastUsed(app, form, openingOf, chooseWith, moves)
  useKeepLastUsed(app, form.values, openingOf, moves)
}
