import { type AppListing, appListing } from "@rosesfield/contract"

export function imageApp(): AppListing {
  return appListing.parse({
    id: "sample-image",
    nameKey: "sample.name",
    category: "image",
    inputs: [
      {
        type: "prompt",
        name: "prompt",
        labelKey: "sample.prompt",
        presence: "required",
        maxLength: 20,
      },
      {
        type: "image",
        name: "references",
        labelKey: "sample.references",
        presence: "optional",
        max: 2,
      },
      {
        type: "character",
        name: "character",
        labelKey: "sample.character",
        presence: "required",
        max: 1,
      },
      {
        type: "number",
        name: "steps",
        labelKey: "sample.steps",
        min: 1,
        max: 50,
        step: 1,
        default: 20,
      },
      { type: "seed", name: "seed", labelKey: "sample.seed" },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "16:9"], default: "16:9" },
    },
    limits: { timeoutSeconds: 600, maxRetries: 2 },
    preview: null,
  })
}

export function audioApp(): AppListing {
  return appListing.parse({
    id: "sample-audio",
    nameKey: "sample.audio",
    category: "audio",
    inputs: [
      {
        type: "prompt",
        name: "script",
        labelKey: "sample.script",
        presence: "optional",
        maxLength: 500,
      },
    ],
    output: { kind: "audio", count: { default: 1, max: 1 } },
    limits: { timeoutSeconds: 120, maxRetries: 0 },
    preview: null,
  })
}

export const assetIds = [
  "6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e01",
  "6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e02",
  "6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e03",
]
