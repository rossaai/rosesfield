import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  appListing,
  type Run,
  run,
} from "@rosesfield/contract"
import { app } from "../../../../../packages/catalog/src/layers/app"

export const layersListing: AppListing = appListing.parse(app)

export const photo = "0a1b2c3d-4e5f-4a6b-8c7d-8e9fa0b1c2d3"
export const firstLayer = "1b2c3d4e-5f6a-4b7c-9d8e-9fa0b1c2d3e4"
export const secondLayer = "2c3d4e5f-6a7b-4c8d-8e9f-a0b1c2d3e4f5"
export const editedLayer = "3d4e5f6a-7b8c-4d9e-9fa0-b1c2d3e4f5a6"
export const maskAsset = "4e5f6a7b-8c9d-4e0f-a0b1-c2d3e4f5a6b7"

function image(name: string, required: boolean): ModelField {
  return {
    kind: "media",
    name,
    path: name,
    required,
    media: "image",
    min: required ? 1 : 0,
    max: 1,
  }
}

const prompt: ModelField = {
  kind: "prompt",
  name: "prompt",
  path: "prompt",
  required: true,
  maxLength: 2000,
  default: null,
}

function model(options: {
  id: string
  maker: string
  task: string
  form: readonly ModelField[] | null
}): CatalogModel {
  return {
    id: options.id,
    kind: options.form === null ? "graph" : "hosted",
    maker: options.maker,
    name: options.id,
    nameKey: null,
    task: options.task,
    tags: [],
    form: options.form === null ? null : [...options.form],
  }
}

export const splitGraph = model({
  id: "qwen-image-layered",
  maker: "Qwen",
  task: "layer-separation",
  form: null,
})

export const seedream = model({
  id: "bytedance/seedream-5.0-pro-layer-separation",
  maker: "ByteDance",
  task: "layer-separation",
  form: [
    image("image", true),
    {
      kind: "choice",
      name: "size",
      path: "size",
      required: false,
      options: ["1K", "2K"],
      default: "1K",
    },
  ],
})

export const editGraph = model({
  id: "qwen-image-edit-2511",
  maker: "Qwen",
  task: "image-edit",
  form: null,
})

export const flux3 = model({
  id: "bfl/flux-3-image",
  maker: "Black Forest Labs",
  task: "image-edit",
  form: [prompt, image("inputImage", true), image("reference", false)],
})

export const relightGraph = model({
  id: "qwen-image-edit-2509-relight",
  maker: "Qwen",
  task: "relight",
  form: null,
})

export const fillGraph = model({
  id: "qwen-image-inpaint",
  maker: "Qwen",
  task: "inpaint",
  form: null,
})

export const fluxFill = model({
  id: "bfl/flux-pro-1.0-fill",
  maker: "Black Forest Labs",
  task: "image-edit",
  form: [prompt, image("image", true), image("mask", true)],
})

export const catalog: readonly CatalogModel[] = [
  splitGraph,
  editGraph,
  relightGraph,
  fillGraph,
  seedream,
  flux3,
  fluxFill,
]

export function layersRun(options: {
  id: string
  minute: number
  inputs: Record<string, unknown>
  outputs: string[]
}): Run {
  const minute = String(options.minute).padStart(2, "0")
  return run.parse({
    id: options.id,
    appId: "layers",
    status: "done",
    inputs: options.inputs,
    count: options.outputs.length,
    aspectRatio: null,
    seed: 7,
    outputs: options.outputs,
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: `2026-10-17T10:${minute}:00.000Z`,
    finishedAt: `2026-10-17T10:${minute}:30.000Z`,
  })
}
