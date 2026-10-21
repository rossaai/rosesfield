import {
  type CatalogModel,
  isHostedModelId,
  type ModelTask,
} from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  type InputDefinition,
  type InputRule,
  inputRulesOf,
} from "@rosesfield/contract"
import {
  isVideoEditMode,
  modeInput,
  modelInput,
  sourceInput,
  type VideoEditMode,
  videoEditModes,
} from "@/studio/video-edit/video-edit-modes"

export type VideoEditTab = {
  mode: VideoEditMode
  labelKey: string
}

export type ClipField = {
  name: string
  isHosted: boolean
}

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

const tabTasks: Readonly<Partial<Record<VideoEditMode, ModelTask>>> = {
  edit: "video-edit",
  background: "background",
}

function choiceInputOf(app: AppListing, name: string): ChoiceInput | null {
  const input = app.inputs.find((one) => one.name === name)
  return input?.type === "choice" ? input : null
}

export function tabsOf(app: AppListing): VideoEditTab[] {
  const options = choiceInputOf(app, modeInput)?.options ?? []
  return videoEditModes.flatMap((mode) => {
    const option = options.find((one) => one.value === mode)
    return option === undefined ? [] : [{ mode, labelKey: option.labelKey }]
  })
}

export function openingTabOf(app: AppListing): VideoEditMode {
  const tabs = tabsOf(app)
  const declared = choiceInputOf(app, modeInput)?.default
  const opening = tabs.find((tab) => tab.mode === declared) ?? tabs[0]
  return opening?.mode ?? "extend"
}

function modelRuleOf(app: AppListing, mode: VideoEditMode): InputRule | null {
  return (
    inputRulesOf(app, { [modeInput]: mode }).find(
      (rule) => rule.input.name === modelInput
    ) ?? null
  )
}

function isBounded(rule: InputRule | null): boolean {
  return (
    rule !== null &&
    rule.input.type === "choice" &&
    rule.input.bounds !== undefined
  )
}

export function modelsOfTab(
  models: readonly CatalogModel[],
  app: AppListing,
  mode: VideoEditMode
): CatalogModel[] {
  const rule = modelRuleOf(app, mode)
  const named = rule?.allowed ?? []
  const task = tabTasks[mode] ?? null
  return models.filter((model) => {
    if (model.kind === "graph") {
      return named.includes(model.id)
    }
    return (
      (task !== null && model.task === task) ||
      (isBounded(rule) && named.includes(model.id))
    )
  })
}

export function modelForTab(
  models: readonly CatalogModel[],
  held: string | null,
  defaults: readonly (string | null)[]
): string | null {
  for (const id of [held, ...defaults]) {
    if (id !== null && models.some((model) => model.id === id)) {
      return id
    }
  }
  return models[0]?.id ?? null
}

export function tabDefaultsOf(
  app: AppListing,
  mode: VideoEditMode,
  catalogDefault: string | null
): (string | null)[] {
  const fallback = modelRuleOf(app, mode)?.fallback
  return [typeof fallback === "string" ? fallback : null, catalogDefault]
}

export function tabOfModel(
  models: readonly CatalogModel[],
  app: AppListing,
  modelId: string
): VideoEditMode | null {
  const tab = tabsOf(app).find((one) =>
    modelsOfTab(models, app, one.mode).some((model) => model.id === modelId)
  )
  return tab?.mode ?? null
}

export function tabOfRun(
  inputs: Readonly<Record<string, unknown>>,
  models: readonly CatalogModel[],
  app: AppListing
): VideoEditMode | null {
  const model = inputs[modelInput]
  if (typeof model === "string" && isHostedModelId(model)) {
    return tabOfModel(models, app, model)
  }
  const mode = inputs[modeInput]
  return isVideoEditMode(mode) ? mode : null
}

export function clipFieldOf(model: CatalogModel | null): ClipField {
  const field = (model?.form ?? []).find(
    (one) => one.kind === "media" && one.media === "video"
  )
  return field === undefined
    ? { name: sourceInput, isHosted: false }
    : { name: field.name, isHosted: true }
}
