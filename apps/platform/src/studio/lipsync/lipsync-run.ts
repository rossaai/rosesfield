import {
  type CatalogModel,
  graphMaker,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import {
  bodyOf,
  type FieldValue,
  type StartRunBodyInput,
} from "@/screens/app/app-form"
import { hostedBody } from "@/screens/app/hosted/hosted-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import {
  formOfModel,
  type LipFields,
  type LipsyncTab,
  lipFieldsOf,
} from "@/studio/lipsync/lipsync-tabs"
import {
  graphBodyAppOf,
  runFieldsOf,
  speechModelInput,
  speechTextInput,
  totalOf,
  type WordsPlan,
} from "@/studio/lipsync/lipsync-words"

export type Inputs = Readonly<Record<string, FieldValue>>

export function fieldsOfModel(
  model: CatalogModel | null,
  app: AppListing
): LipFields | null {
  const form = formOfModel(model, app)
  return form === null ? null : lipFieldsOf(form)
}

export function withAppModel(
  app: AppListing,
  hosted: HostedState
): HostedState {
  if (hosted.isTaskApp) {
    return hosted
  }
  const own: CatalogModel = {
    id: app.id,
    kind: "graph",
    maker: graphMaker,
    name: app.id,
    nameKey: app.nameKey,
    task: "lip-sync",
    tags: [],
    form: null,
  }
  return { ...hosted, chosen: own }
}

const carriedInputs: readonly string[] = [speechTextInput, speechModelInput]

function isHeld(value: FieldValue): boolean {
  return Array.isArray(value)
    ? value.length > 0
    : value !== undefined && value !== ""
}

export function carry(options: {
  from: LipFields | null
  to: LipFields | null
  kept: Inputs
  setInput: AppForm["setInput"]
}): void {
  const { from, to, kept, setInput } = options
  const pairs: readonly (readonly [ModelField | null, ModelField | null])[] = [
    [from?.photo ?? null, to?.photo ?? null],
    [from?.clip ?? null, to?.clip ?? null],
    [from?.audio ?? null, to?.audio ?? null],
    [from?.text ?? null, to?.text ?? null],
  ]
  for (const [one, other] of pairs) {
    const value = one === null ? undefined : kept[one.name]
    if (other !== null && isHeld(value)) {
      setInput(other.name, value)
    }
  }
  for (const name of carriedInputs) {
    if (isHeld(kept[name])) {
      setInput(name, kept[name])
    }
  }
}

export type RunParts = {
  bodyApp: AppListing
  runFields: ModelField[] | null
  runHosted: HostedState
  ask: StartRunBodyInput | null
}

export function runPartsOf(options: {
  app: AppListing
  all: HostedState
  fields: LipFields | null
  tab: LipsyncTab
  plan: WordsPlan
  voices: readonly string[]
  values: AppForm["values"]
}): RunParts {
  const { app, all, fields, tab, plan, voices, values } = options
  const chosen = all.chosen
  const runFields =
    fields === null ? null : runFieldsOf({ fields, tab, plan, voices })
  const isGraph = chosen?.kind === "graph"
  const bodyApp =
    isGraph && fields !== null
      ? graphBodyAppOf({ app, fields, tab, plan, voices })
      : app
  const runChosen =
    chosen === null || isGraph || runFields === null
      ? chosen
      : { ...chosen, form: runFields }
  const form = runChosen?.form ?? null
  const ask =
    runChosen === null
      ? null
      : form === null
        ? bodyOf(bodyApp, values)
        : hostedBody(runChosen.id, form, values, app.output.kind)
  return {
    bodyApp,
    runFields,
    runHosted: { ...all, chosen: runChosen, fields: form },
    ask,
  }
}

export function pricedStart(
  started: StartRun,
  lip: number | null,
  speech: number | null,
  isChain: boolean
): StartRun {
  if (!isChain || started.price === t("run.price.demo")) {
    return started
  }
  const total = totalOf(lip, speech)
  const amount = total === null ? null : formatNumber(total)
  return {
    ...started,
    price: amount === null ? t("run.price.unknown") : "",
    priceValue: amount,
    priceName: amount === null ? null : t("run.generate.priced", { amount }),
  }
}

export function guardedStart(options: {
  started: StartRun
  form: AppForm
  wells: readonly (string | null)[]
  isWaiting: (name: string) => boolean
  focus: (name: string) => void
}): StartRun {
  return {
    ...options.started,
    generate: () => {
      if (!options.form.validate()) {
        return
      }
      const waiting = options.wells.find(
        (name): name is string => name !== null && options.isWaiting(name)
      )
      if (waiting !== undefined) {
        options.focus(waiting)
        return
      }
      options.started.generate()
    },
  }
}
