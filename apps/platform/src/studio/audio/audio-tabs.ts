import type { CatalogModel } from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  type InputDefinition,
  inputRulesOf,
} from "@rosesfield/contract"
import type { FormValues } from "@/screens/app/app-form"
import { modelInputName } from "@/screens/app/hosted/hosted-form"

export const modeInput = "mode"

export const voiceCloneTab = "clone"

export type AudioTab = {
  value: string
  labelKey: string
}

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

export function modeInputOf(app: AppListing): ChoiceInput | null {
  return (
    app.inputs.find(
      (input): input is ChoiceInput =>
        input.type === "choice" && input.name === modeInput
    ) ?? null
  )
}

export function tabsOf(app: AppListing): AudioTab[] {
  return (modeInputOf(app)?.options ?? []).map((option) => ({
    value: option.value,
    labelKey: option.labelKey,
  }))
}

export function defaultTabOf(app: AppListing): string {
  const input = modeInputOf(app)
  return input?.default ?? input?.options[0]?.value ?? ""
}

function isTab(app: AppListing, value: unknown): value is string {
  return tabsOf(app).some((tab) => tab.value === value)
}

export function tabOfValues(app: AppListing, values: FormValues): string {
  const value = values.inputs[modeInput]
  return isTab(app, value) ? value : defaultTabOf(app)
}

export function tabOfHash(app: AppListing, hash: string): string | null {
  const value = hash.replace(/^#/, "")
  return isTab(app, value) ? value : null
}

export function graphsOfTab(
  app: AppListing,
  tab: string
): readonly string[] | null {
  const rule = inputRulesOf(app, { [modeInput]: tab }).find(
    (one) => one.input.name === modelInputName
  )
  return rule?.allowed ?? null
}

export function modelsOfTab(
  models: readonly CatalogModel[],
  tab: string,
  app: AppListing
): CatalogModel[] {
  const allowed = graphsOfTab(app, tab)
  return models.filter((model) =>
    model.kind === "graph"
      ? allowed === null || allowed.includes(model.id)
      : model.task === tab
  )
}

export function isOnTab(
  models: readonly CatalogModel[],
  tab: string,
  app: AppListing,
  id: string | null
): boolean {
  return (
    id !== null && modelsOfTab(models, tab, app).some((one) => one.id === id)
  )
}

export function modelForTab(
  models: readonly CatalogModel[],
  tab: string,
  app: AppListing,
  wanted: readonly (string | null)[]
): string | null {
  const shown = modelsOfTab(models, tab, app)
  for (const id of wanted) {
    if (id !== null && shown.some((model) => model.id === id)) {
      return id
    }
  }
  return (
    shown.find((model) => model.kind === "graph")?.id ?? shown[0]?.id ?? null
  )
}
