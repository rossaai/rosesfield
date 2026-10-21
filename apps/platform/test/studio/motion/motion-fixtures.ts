import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import { type AppListing, appListing } from "@rosesfield/contract"

export const graphId = "ltx-2-3-control"

export function motionListing(): AppListing {
  return appListing.parse({
    id: "motion",
    nameKey: "motion.name",
    category: "video",
    inputs: [
      {
        type: "image",
        name: "photo",
        labelKey: "motion.input.photo.label",
        presence: "required",
        max: 1,
      },
      {
        type: "video",
        name: "clip",
        labelKey: "motion.input.clip.label",
        presence: "required",
        max: 1,
      },
      {
        type: "choice",
        name: "model",
        labelKey: "motion.input.model.label",
        options: [{ value: graphId, labelKey: "motion.model.ltx23" }],
        default: graphId,
      },
      {
        type: "toggle",
        name: "sound",
        labelKey: "motion.input.sound.label",
        default: "off",
      },
      { type: "seed", name: "seed", labelKey: "motion.input.seed.label" },
    ],
    output: {
      kind: "video",
      count: { default: 1, max: 1 },
      aspectRatios: {
        options: ["1:1", "4:3", "3:4", "16:9", "9:16"],
        default: "9:16",
      },
    },
    limits: { timeoutSeconds: 1800, maxRetries: 2 },
    preview: null,
  })
}

function media(name: string, kind: "image" | "video"): ModelField {
  return {
    kind: "media",
    name,
    path: name,
    required: true,
    media: kind,
    min: 1,
    max: 1,
  }
}

function model(
  id: string,
  maker: string,
  task: string,
  form: readonly ModelField[] | null
): CatalogModel {
  return {
    id,
    kind: form === null ? "graph" : "hosted",
    maker,
    name: id,
    nameKey: null,
    task,
    tags: [],
    form: form === null ? null : [...form],
  }
}

export const graph = model(graphId, "comfy-cloud", "motion-transfer", null)

export const mover = model("lab/move-v1", "Lab", "motion-transfer", [
  media("referenceVideo", "video"),
  media("characterImage", "image"),
  {
    kind: "number",
    name: "duration",
    path: "duration",
    required: false,
    min: 3,
    max: 8,
    integer: true,
    default: 5,
  },
  {
    kind: "prompt",
    name: "prompt",
    path: "prompt",
    required: false,
    maxLength: 500,
    default: null,
  },
])

export const swapper = model("lab/swap-v1", "Lab", "character-swap", [
  media("video", "video"),
  media("image", "image"),
])

export const catalog: readonly CatalogModel[] = [graph, mover, swapper]
