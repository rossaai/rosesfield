import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { findCatalogApp } from "@/catalog/catalog-apps"

export function upscaleListing(): AppListing {
  const app = findCatalogApp("upscale")
  if (app === null) {
    throw new Error("The catalog lists no upscale app")
  }
  return app
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
  form: readonly ModelField[] | null
): CatalogModel {
  return {
    id,
    kind: form === null ? "graph" : "hosted",
    maker,
    name: id,
    nameKey: null,
    task: "upscale",
    tags: [],
    form: form === null ? null : [...form],
  }
}

export const graph = model("seedvr2-3b", "comfy-cloud", null)

export const waveSpeed = model("wavespeed/seedvr2", "WaveSpeed", [
  media("inputImage", "image"),
  {
    kind: "choice",
    name: "targetResolution",
    path: "target_resolution",
    required: false,
    options: ["2k", "4k", "8k"],
    default: "4k",
  },
  {
    kind: "choice",
    name: "outputFormat",
    path: "output_format",
    required: false,
    options: ["jpeg", "png", "webp"],
    default: "jpeg",
  },
])

export const fluxVideo = model("bfl/video-upscale-v1", "Black Forest Labs", [
  media("inputVideo", "video"),
  {
    kind: "number",
    name: "upscaleFactor",
    path: "upscale_factor",
    required: false,
    min: 1.5,
    max: 3,
    integer: false,
    default: 2,
  },
])

export const flashVsr = model("wavespeed/flashvsr", "WaveSpeed", [
  media("video", "video"),
  {
    kind: "number",
    name: "duration",
    path: "duration",
    required: true,
    min: null,
    max: null,
    integer: false,
    default: null,
  },
])

export const bria = model("bria/image-edit-increase-resolution", "Bria", [
  media("image", "image"),
  {
    kind: "number",
    name: "desiredIncrease",
    path: "desired_increase",
    required: false,
    min: null,
    max: null,
    integer: true,
    default: null,
  },
])

export const catalog: readonly CatalogModel[] = [
  graph,
  bria,
  fluxVideo,
  waveSpeed,
  flashVsr,
]
