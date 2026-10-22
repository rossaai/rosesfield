import { type AppDefinition, appDefinition } from "@rosesfield/contract"

export const start = new Date("2026-10-17T09:00:00.000Z")

export function imageApp(): AppDefinition {
  return appDefinition.parse({
    id: "sample-image",
    nameKey: "name",
    category: "image",
    inputs: [
      {
        type: "prompt",
        name: "prompt",
        labelKey: "inputs.prompt",
        presence: "required",
        maxLength: 2000,
      },
      {
        type: "image",
        name: "references",
        labelKey: "inputs.references",
        presence: "optional",
        max: 4,
      },
      { type: "seed", name: "seed", labelKey: "inputs.seed" },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "16:9"], default: "1:1" },
    },
    engine: { adapter: "comfy-workflow", config: { workflow: {} } },
    limits: { timeoutSeconds: 600, maxRetries: 2 },
  })
}

export function motionApp(): AppDefinition {
  return appDefinition.parse({
    id: "sample-motion",
    nameKey: "name",
    category: "video",
    inputs: [
      {
        type: "image",
        name: "image",
        labelKey: "inputs.image",
        presence: "required",
        max: 1,
      },
      {
        type: "prompt",
        name: "prompt",
        labelKey: "inputs.prompt",
        presence: "required",
        maxLength: 2000,
      },
    ],
    output: {
      kind: "video",
      count: { default: 1, max: 1 },
      aspectRatios: { options: ["16:9"], default: "16:9" },
    },
    engine: { adapter: "comfy-workflow", config: { workflow: {} } },
    limits: { timeoutSeconds: 600, maxRetries: 2 },
  })
}

export const assetUuid = "0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f"
export const characterUuid = "7f6e5d4c-3b2a-4190-a8b7-c6d5e4f3a2b1"
