import {
  type AppListing,
  type Asset,
  appListing,
  asset,
  type Run,
  run,
} from "@rosesfield/contract"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import demoWide from "@/gallery/fixtures/demo-image-16-9.png"

export const silentWav =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="

const createdAt = "2026-10-17T09:00:00.000Z"

export const galleryApp: AppListing = appListing.parse({
  id: "gallery-sample",
  nameKey: "kind.image",
  category: "image",
  inputs: [
    {
      type: "prompt",
      name: "prompt",
      labelKey: "viewer.label.prompt",
      presence: "required",
      maxLength: 200,
    },
    {
      type: "image",
      name: "photos",
      labelKey: "characters.new.photos.label",
      presence: "optional",
      max: 4,
    },
    {
      type: "choice",
      name: "kind",
      labelKey: "apps.kind.label",
      options: [
        { value: "image", labelKey: "kind.image" },
        { value: "video", labelKey: "kind.video" },
        { value: "audio", labelKey: "kind.audio" },
      ],
      default: "image",
    },
    {
      type: "number",
      name: "count",
      labelKey: "field.count.label",
      min: 1,
      max: 4,
      step: 1,
      default: 2,
    },
    {
      type: "toggle",
      name: "sound",
      labelKey: "output.soundOn",
      default: "on",
    },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 4 },
    aspectRatios: { options: ["16:9", "1:1"], default: "16:9" },
  },
  limits: { timeoutSeconds: 600, maxRetries: 2 },
  preview: null,
})

function assetOf(id: string, change: Partial<Asset>): Asset {
  return asset.parse({
    id,
    kind: "image",
    mime: "image/png",
    bytes: 2048,
    width: 1600,
    height: 900,
    durationSeconds: null,
    sourceRunId: null,
    createdAt,
    ...change,
  })
}

export const galleryAssets = {
  wide: assetOf("0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01", {}),
  square: assetOf("0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c02", {
    width: 1024,
    height: 1024,
  }),
  sound: assetOf("0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c03", {
    kind: "audio",
    mime: "audio/wav",
    width: null,
    height: null,
    durationSeconds: 2,
  }),
}

export const gallerySources: ReadonlyArray<readonly [string, string]> = [
  [galleryAssets.wide.id, demoWide],
  [galleryAssets.square.id, demoSquare],
  [galleryAssets.sound.id, silentWav],
]

export function galleryRun(change: Partial<Run>): Run {
  return run.parse({
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e01",
    appId: galleryApp.id,
    status: "done",
    inputs: { prompt: "A red bicycle against a white wall" },
    count: 2,
    aspectRatio: "16:9",
    seed: 1234,
    outputs: [galleryAssets.wide.id, galleryAssets.wide.id],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt,
    finishedAt: "2026-10-17T09:00:03.000Z",
    ...change,
  })
}
