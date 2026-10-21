import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import { type AppListing, appListing } from "@rosesfield/contract"

export function threeDApp(): AppListing {
  return appListing.parse({
    id: "three-d",
    nameKey: "threeD.name",
    category: "image",
    inputs: [
      {
        type: "image",
        name: "image",
        labelKey: "threeD.input.image.label",
        presence: "required",
        max: 1,
      },
      {
        type: "choice",
        name: "model",
        labelKey: "threeD.input.model.label",
        options: [
          { value: "pixal3d-trellis-2", labelKey: "threeD.model.pixal3d" },
        ],
        default: "pixal3d-trellis-2",
      },
      { type: "seed", name: "seed", labelKey: "threeD.input.seed.label" },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 1 },
      aspectRatios: { options: ["1:1"], default: "1:1" },
    },
    limits: { timeoutSeconds: 600, maxRetries: 0 },
  })
}

const prompt: ModelField = {
  name: "prompt",
  path: "prompt",
  required: true,
  kind: "prompt",
  maxLength: 600,
  default: null,
}

const polycount: ModelField = {
  name: "targetPolycount",
  path: "target_polycount",
  required: false,
  kind: "number",
  min: 100,
  max: 300_000,
  integer: true,
  default: 30_000,
}

function imageField(required: boolean): ModelField {
  return {
    name: "image",
    path: "image_url",
    required,
    kind: "media",
    media: "image",
    min: required ? 1 : 0,
    max: 1,
  }
}

function model(
  id: string,
  kind: CatalogModel["kind"],
  form: CatalogModel["form"]
): CatalogModel {
  return {
    id,
    kind,
    maker: id.split("/")[0] ?? id,
    name: id,
    nameKey: null,
    task: "three-d",
    tags: [],
    form,
  }
}

export const graph = model("pixal3d-trellis-2", "graph", null)
export const meshy71 = model("meshy/meshy-7.1", "hosted", [prompt, polycount])
export const meshy6 = model("meshy/meshy-6", "hosted", [prompt])
export const hunyuan = model("tencent/hunyuan-3d-3", "hosted", [
  imageField(true),
  polycount,
])
export const either = model("tripo/tripo-3", "hosted", [
  { ...prompt, required: false },
  imageField(false),
])
export const formless = model("acme/mesh-1", "hosted", null)
