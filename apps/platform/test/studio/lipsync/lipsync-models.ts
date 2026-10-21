import { findApp } from "@rosesfield/catalog"
import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import { type AppListing, appListing } from "@rosesfield/contract"
import type { FieldValue } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"

const lipsync = appListing.parse(findApp("lipsync"))

export const photoApp: AppListing = {
  ...lipsync,
  inputs: [
    {
      type: "choice",
      name: "model",
      labelKey: "lipsync.input.mode.label",
      options: [{ value: "lipsync-photo-ltx-2-3", labelKey: "lipsync.name" }],
      default: "lipsync-photo-ltx-2-3",
    },
    {
      type: "image",
      name: "photo",
      labelKey: "lipsync.input.photo.label",
      presence: "required",
      max: 1,
    },
    {
      type: "audio",
      name: "audio",
      labelKey: "lipsync.input.audio.label",
      presence: "required",
      max: 1,
    },
    {
      type: "number",
      name: "length",
      labelKey: "lipsync.input.length.label",
      min: 2,
      max: 10,
      step: 1,
      default: 5,
    },
    { type: "seed", name: "seed", labelKey: "field.seed.label" },
  ],
}

function media(
  name: string,
  kind: "image" | "video" | "audio",
  required: boolean,
  max = 1
): ModelField {
  return {
    kind: "media",
    media: kind,
    name,
    path: name,
    required,
    min: 0,
    max,
  }
}

export const ltx: CatalogModel = {
  id: "lipsync-photo-ltx-2-3",
  kind: "graph",
  maker: "comfy-cloud",
  name: "LTX 2.3 lip sync",
  nameKey: null,
  task: "lip-sync",
  tags: [{ kind: "open-weights" }],
  form: null,
}

export const avatar: CatalogModel = {
  id: "kling/videos-avatar-image2video",
  kind: "hosted",
  maker: "Kling",
  name: "Kling Avatar 2.0",
  nameKey: null,
  task: "lip-sync",
  tags: [{ kind: "hosted" }],
  form: [
    media("image", "image", true),
    media("soundFile", "audio", true),
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: false,
      maxLength: 2500,
      default: null,
    },
    {
      kind: "choice",
      name: "mode",
      path: "mode",
      required: false,
      options: ["std", "pro"],
      default: "std",
    },
  ],
}

export const lipSync: CatalogModel = {
  id: "kling/videos-lip-sync",
  kind: "hosted",
  maker: "Kling",
  name: "Kling Lip Sync",
  nameKey: null,
  task: "lip-sync",
  tags: [{ kind: "hosted" }],
  form: [
    media("video", "video", true),
    media("audioFile", "audio", false),
    {
      kind: "text",
      name: "text",
      path: "input.text",
      required: false,
      maxLength: 120,
      default: null,
    },
    {
      kind: "choice",
      name: "voiceId",
      path: "input.voice_id",
      required: false,
      options: ["genshin_vindi2", "oversea_male1"],
      default: null,
    },
  ],
}

export const seedance: CatalogModel = {
  id: "byteplus/dreamina-seedance-2-5-260628",
  kind: "hosted",
  maker: "ByteDance",
  name: "Dreamina Seedance 2.5",
  nameKey: null,
  task: "lip-sync",
  tags: [{ kind: "hosted" }, { kind: "length", min: 4, max: 15 }],
  form: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
      default: null,
    },
    media("referenceImages", "image", false, 9),
    media("referenceVideos", "video", false, 3),
    media("referenceAudios", "audio", false, 3),
    {
      kind: "number",
      name: "duration",
      path: "duration",
      required: false,
      min: 4,
      max: 15,
      integer: true,
      default: 5,
    },
  ],
}

export const speech: CatalogModel = {
  id: "elevenlabs/eleven-v3",
  kind: "hosted",
  maker: "ElevenLabs",
  name: "Eleven v3",
  nameKey: null,
  task: "speech",
  tags: [{ kind: "hosted" }],
  form: [
    {
      kind: "text",
      name: "text",
      path: "text",
      required: true,
      maxLength: 5000,
      default: null,
    },
  ],
}

export const catalog: readonly CatalogModel[] = [
  ltx,
  avatar,
  lipSync,
  seedance,
  speech,
]

export const photoId = "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d"
export const clipId = "7b8c9d0e-1f2a-4b3c-9d4e-5f6a7b8c9d0e"
export const audioId = "8c9d0e1f-2a3b-4c4d-8e5f-6a7b8c9d0e1f"

export function valuesOf(
  inputs: Record<string, FieldValue>
): AppForm["values"] {
  return { inputs, seedMode: "random", count: 1, aspectRatio: "1:1" }
}
