import type { CatalogModel } from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import type { FormValues } from "@/screens/app/app-form"

export const modeInput = "mode"

export const voiceCloneTab = "voice-clone"

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

export function modelsOfTab(
  models: readonly CatalogModel[],
  tab: string
): CatalogModel[] {
  const graphs = models.filter((model) => model.kind === "graph")
  const ownGraphs = graphs.filter((model) => model.task === tab)
  const shownGraphs = ownGraphs.length > 0 ? ownGraphs : graphs
  return models.filter(
    (model) =>
      shownGraphs.includes(model) ||
      (model.kind === "hosted" && model.task === tab)
  )
}

export function isOnTab(
  models: readonly CatalogModel[],
  tab: string,
  id: string | null
): boolean {
  return id !== null && modelsOfTab(models, tab).some((one) => one.id === id)
}

export function modelForTab(
  models: readonly CatalogModel[],
  tab: string,
  wanted: readonly (string | null)[]
): string | null {
  const shown = modelsOfTab(models, tab)
  for (const id of wanted) {
    if (id !== null && shown.some((model) => model.id === id)) {
      return id
    }
  }
  return (
    shown.find((model) => model.kind === "graph")?.id ?? shown[0]?.id ?? null
  )
}
