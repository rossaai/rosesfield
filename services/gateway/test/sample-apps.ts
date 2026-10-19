import { type AppDefinition, appDefinition } from "@rosesfield/contract"

export const start = new Date("2026-10-17T09:00:00.000Z")

export const ownerToken = "d41f6c2a9b7e4f05a8c3e1b6d2f9a074"

export const sessionSecret = "c3f1a9e07b2d4c58a6e9d1f0b4c7e2a9"

export const pngBytes = Uint8Array.of(
  137,
  80,
  78,
  71,
  13,
  10,
  26,
  10,
  0,
  0,
  0,
  13
)

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
      {
        type: "character",
        name: "character",
        labelKey: "inputs.character",
        presence: "optional",
        max: 1,
      },
      { type: "seed", name: "seed", labelKey: "inputs.seed" },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "16:9"], default: "1:1" },
    },
    engine: {
      adapter: "comfy-workflow",
      config: {
        workflow: {
          "3": { class_type: "KSampler", inputs: { seed: 0, steps: 4 } },
          "6": { class_type: "CLIPTextEncode", inputs: { text: "" } },
          "9": { class_type: "SaveImage", inputs: { images: ["8", 0] } },
        },
        bindings: [
          { from: "input", name: "prompt", path: ["6", "inputs", "text"] },
          { from: "seed", path: ["3", "inputs", "seed"] },
        ],
      },
    },
    limits: { timeoutSeconds: 600, maxRetries: 2 },
  })
}

export function audioApp(): AppDefinition {
  return appDefinition.parse({
    id: "sample-audio",
    nameKey: "name",
    category: "audio",
    inputs: [
      {
        type: "prompt",
        name: "script",
        labelKey: "inputs.script",
        presence: "required",
        maxLength: 500,
      },
    ],
    output: { kind: "audio", count: { default: 1, max: 1 } },
    engine: {
      adapter: "comfy-workflow",
      config: { workflow: {}, bindings: [] },
    },
    limits: { timeoutSeconds: 120, maxRetries: 0 },
  })
}
