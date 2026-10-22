import type { CatalogModel } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import type { ThreeDKey } from "@/studio/three-d/copy.en"

export type ThreeDTab = "image" | "text"

export const threeDTabs: readonly ThreeDTab[] = ["text", "image"]

export const openingTab: ThreeDTab = "text"

export const tabKeys = {
  image: "threeD.tab.image",
  text: "threeD.tab.text",
} as const satisfies Record<ThreeDTab, ThreeDKey>

export const textModel = "meshy/meshy-7.1"

type Takes = {
  image: boolean
  needsImage: boolean
  prompt: boolean
}

type AppInput = AppListing["inputs"][number]

type ImageInput = Extract<AppInput, { type: "image" }>

function isImageInput(input: AppInput): input is ImageInput {
  return input.type === "image"
}

function takesOf(model: CatalogModel, app: AppListing): Takes | null {
  if (model.kind === "graph" && model.form === null) {
    const images = app.inputs.filter(isImageInput)
    return {
      image: images.length > 0,
      needsImage: images.some((input) => input.presence === "required"),
      prompt: app.inputs.some((input) => input.type === "prompt"),
    }
  }
  if (model.form === null) {
    return null
  }
  const images = model.form.filter(
    (field) => field.kind === "media" && field.media === "image"
  )
  return {
    image: images.length > 0,
    needsImage: images.some((field) => field.required),
    prompt: model.form.some((field) => field.kind === "prompt"),
  }
}

export function tabsOfModel(
  model: CatalogModel,
  app: AppListing
): ThreeDTab[] {
  const takes = takesOf(model, app)
  if (takes === null) {
    return [...threeDTabs]
  }
  const has: Readonly<Record<ThreeDTab, boolean>> = {
    image: takes.image,
    text: takes.prompt && !takes.needsImage,
  }
  return threeDTabs.filter((tab) => has[tab])
}

export function modelsOfTab(
  models: readonly CatalogModel[],
  tab: ThreeDTab,
  app: AppListing
): CatalogModel[] {
  return models.filter((model) => tabsOfModel(model, app).includes(tab))
}

export function defaultsOfTab(
  models: readonly CatalogModel[],
  tab: ThreeDTab
): string[] {
  if (tab === "text") {
    return [textModel]
  }
  return models.filter((model) => model.kind === "graph").map((one) => one.id)
}

export function modelForTab(
  models: readonly CatalogModel[],
  chosen: readonly (string | null)[]
): string | null {
  for (const id of chosen) {
    if (id !== null && models.some((model) => model.id === id)) {
      return id
    }
  }
  return models[0]?.id ?? null
}

export function shownTabs(
  models: readonly CatalogModel[],
  app: AppListing
): ThreeDTab[] {
  return threeDTabs.filter(
    (tab) => tab === openingTab || modelsOfTab(models, tab, app).length > 0
  )
}
