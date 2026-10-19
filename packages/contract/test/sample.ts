import type { z } from "zod"
import type { appDefinition } from "#app.contract"
import type { run } from "#run.contract"

export const assetUuid = "0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f"
export const secondAssetUuid = "6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
export const characterUuid = "7f6e5d4c-3b2a-4190-a8b7-c6d5e4f3a2b1"
export const runUuid = "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f"

export function sampleApp(): z.input<typeof appDefinition> {
  return {
    id: "sample",
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
        type: "video",
        name: "motion",
        labelKey: "inputs.motion",
        presence: "optional",
        max: 1,
      },
      {
        type: "audio",
        name: "voice",
        labelKey: "inputs.voice",
        presence: "optional",
        max: 1,
      },
      {
        type: "character",
        name: "character",
        labelKey: "inputs.character",
        presence: "optional",
        max: 1,
      },
      {
        type: "choice",
        name: "quality",
        labelKey: "inputs.quality",
        options: [
          { value: "draft", labelKey: "quality.draft" },
          { value: "final", labelKey: "quality.final" },
        ],
        default: "draft",
      },
      {
        type: "number",
        name: "strength",
        labelKey: "inputs.strength",
        min: 0,
        max: 1,
        step: 0.05,
        default: 0.5,
      },
      {
        type: "toggle",
        name: "upscale",
        labelKey: "inputs.upscale",
        default: "off",
      },
      { type: "seed", name: "seed", labelKey: "inputs.seed" },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "16:9", "9:16"], default: "1:1" },
    },
    engine: { adapter: "sample-engine", config: { graph: "sample" } },
    limits: { timeoutSeconds: 600, maxRetries: 2 },
  }
}

export function sampleRun(): z.input<typeof run> {
  return {
    id: runUuid,
    appId: "sample",
    status: "done",
    inputs: { prompt: "a red door in fog", references: [assetUuid] },
    count: 1,
    aspectRatio: "16:9",
    seed: 42,
    outputs: [secondAssetUuid],
    progress: 1,
    engine: {
      adapter: "sample-engine",
      models: ["sample-model"],
      workflowHash: "3f2a",
    },
    cost: { amount: 0.02, currency: "USD" },
    origin: "live",
    failure: null,
    createdAt: "2026-10-17T09:00:00.000Z",
    finishedAt: "2026-10-17T09:01:30.000Z",
  }
}
