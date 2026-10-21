import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { textOf } from "@/screens/app/fields/field-props"
import {
  modelCatalogQuery,
  type PriceAsk,
  priceQuery,
} from "@/screens/app/hosted/model-catalog-query"
import { taskAppOf } from "@/screens/app/hosted/task-app"
import { useDebounced } from "@/screens/app/hosted/use-debounced"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { speechTask } from "@/studio/lipsync/lipsync-tabs"
import { speechAskOf, speechModelInput } from "@/studio/lipsync/lipsync-words"

export const voiceApps: readonly string[] = ["audio", "voice"]

const priceDelayMs = 300

export type Voices = {
  hosted: HostedState
  sourceOf: (model: CatalogModel) => string
}

function voiceAppOf(): string | null {
  return voiceApps.find((id) => taskAppOf(id) !== null) ?? null
}

export function useVoices(options: {
  appId: string
  lipsync: HostedState
  form: AppForm
  isChain: boolean
}): Voices {
  const { lipsync, form } = options
  const source = voiceAppOf()
  const query = useQuery({
    ...modelCatalogQuery(source ?? "", lipsync.keyState),
    enabled: source !== null,
  })
  const outside = (query.data?.models ?? []).filter(
    (model) => model.task === speechTask
  )
  const own = lipsync.models.filter(
    (model) =>
      model.task === speechTask && !outside.some((one) => one.id === model.id)
  )
  const models = [...outside, ...own]
  const audioDefault = query.data?.defaultModel ?? null
  const defaultModel = models.some((model) => model.id === audioDefault)
    ? audioDefault
    : (models[0]?.id ?? null)
  const held = textOf(form.values.inputs[speechModelInput])
  const chosenId = held === "" ? defaultModel : held
  const chosen = models.find((model) => model.id === chosenId) ?? null
  const { setInput } = form
  useEffect(() => {
    if (options.isChain && held === "" && defaultModel !== null) {
      setInput(speechModelInput, defaultModel)
    }
  }, [options.isChain, held, defaultModel, setInput])
  return {
    hosted: {
      ...lipsync,
      models,
      isLoading: lipsync.isLoading || (source !== null && query.isPending),
      error: lipsync.error ?? query.error,
      defaultModel,
      chosen,
      fields: chosen?.form ?? null,
      ranBefore: [],
      choose: (id) => setInput(speechModelInput, id),
    },
    sourceOf: (model) =>
      outside.some((one) => one.id === model.id) && source !== null
        ? source
        : options.appId,
  }
}

export function useSpeechCredits(options: {
  voices: Voices
  text: string
  isChain: boolean
}): number | null {
  const { voices } = options
  const voice = voices.hosted.chosen
  const ask: PriceAsk | null = options.isChain
    ? speechAskOf(voice, options.text)
    : null
  const held = useDebounced(ask, priceDelayMs)
  const appId = voice === null ? "" : voices.sourceOf(voice)
  const query = useQuery({
    ...priceQuery(appId, held ?? { inputs: {} }, voices.hosted.keyState),
    enabled: held !== null && appId !== "",
  })
  const price = query.data?.price
  return price === undefined || price.source === "unknown"
    ? null
    : price.credits
}

export function useLipCredits(options: {
  appId: string
  ask: PriceAsk | null
  keyState: string
}): number | null {
  const held = useDebounced(options.ask, priceDelayMs)
  const query = useQuery({
    ...priceQuery(options.appId, held ?? { inputs: {} }, options.keyState),
    enabled: held !== null,
  })
  const price = query.data?.price
  return price === undefined || price.source === "unknown"
    ? null
    : price.credits
}
