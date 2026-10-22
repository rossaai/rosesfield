import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import { type AppListing, appListing } from "@rosesfield/contract"
import { app } from "../../../../../packages/catalog/src/video-edit/app"

export const dreaminaId = "byteplus/dreamina-seedance-2-5-260628"
export const fluxEditId = "bfl/video-edit-v1"
export const fluxContinueId = "bfl/flux-3-video"
export const briaId = "bria/video-background-removal"

const graphIds = {
  extend: "ltx-2-5",
  reframe: "ltx-2-3-outpainting",
  background: "birefnet",
  frameRate: "film",
}

const prompt: ModelField = {
  kind: "prompt",
  name: "prompt",
  path: "prompt",
  required: true,
  maxLength: null,
  default: null,
}

function clipField(name: string): ModelField {
  return {
    kind: "media",
    name,
    path: name,
    required: true,
    media: "video",
    min: 1,
    max: 1,
  }
}

function inMode(mode: string, values: string[]) {
  return { when: [{ input: "mode", is: [mode] }], values }
}

const base = appListing.parse(app)

export const fiveTabs: AppListing = appListing.parse({
  ...base,
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "videoEdit.input.mode.label",
      options: [
        { value: "edit", labelKey: "videoEdit.choice.mode.edit" },
        { value: "extend", labelKey: "videoEdit.choice.mode.extend" },
        { value: "reframe", labelKey: "videoEdit.choice.mode.reframe" },
        { value: "background", labelKey: "videoEdit.choice.mode.background" },
        { value: "frame-rate", labelKey: "videoEdit.choice.mode.frameRate" },
      ],
      default: "edit",
    },
    {
      type: "video",
      name: "source",
      labelKey: "videoEdit.input.source.label",
      presence: "required",
      max: 1,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "videoEdit.input.mode.label",
      options: [
        dreaminaId,
        fluxEditId,
        graphIds.extend,
        fluxContinueId,
        graphIds.reframe,
        graphIds.background,
        graphIds.frameRate,
      ].map((value) => ({ value, labelKey: "videoEdit.name" })),
      default: dreaminaId,
      bounds: [
        inMode("edit", [dreaminaId, fluxEditId]),
        inMode("extend", [graphIds.extend, fluxContinueId]),
        inMode("reframe", [graphIds.reframe]),
        inMode("background", [graphIds.background]),
        inMode("frame-rate", [graphIds.frameRate]),
      ],
    },
    {
      type: "choice",
      name: "color",
      labelKey: "videoEdit.input.color.label",
      options: [{ value: "green", labelKey: "videoEdit.choice.color.green" }],
      default: "green",
      when: [{ input: "mode", is: ["background"] }],
    },
  ],
})

function hosted(
  id: string,
  task: string,
  form: ModelField[],
  length: { min: number; max: number } | null
): CatalogModel {
  return {
    id,
    kind: "hosted",
    maker: id.split("/")[0] ?? id,
    name: id,
    nameKey: null,
    task,
    tags: length === null ? [] : [{ kind: "length", ...length }],
    form,
  }
}

function graph(id: string): CatalogModel {
  return {
    id,
    kind: "graph",
    maker: "comfy-cloud",
    name: id,
    nameKey: null,
    task: "video-edit",
    tags: [{ kind: "open-weights" }],
    form: null,
  }
}

export const dreamina = hosted(
  dreaminaId,
  "video-edit",
  [prompt, clipField("video")],
  { min: 4, max: 15 }
)

export const fluxEdit = hosted(
  fluxEditId,
  "video-edit",
  [prompt, clipField("videoUrl")],
  null
)

export const fluxContinue = hosted(
  fluxContinueId,
  "video-edit",
  [prompt, clipField("video")],
  { min: 1, max: 10 }
)

export const bria = hosted(briaId, "background", [clipField("video")], null)

export const graphs = {
  extend: graph(graphIds.extend),
  reframe: graph(graphIds.reframe),
  background: graph(graphIds.background),
  frameRate: graph(graphIds.frameRate),
}

export const catalog: readonly CatalogModel[] = [
  graphs.extend,
  graphs.reframe,
  graphs.background,
  graphs.frameRate,
  bria,
  dreamina,
  fluxContinue,
  fluxEdit,
]

export function ids(models: readonly CatalogModel[]): string[] {
  return models.map((model) => model.id)
}
