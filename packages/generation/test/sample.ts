import {
  type AppDefinition,
  appDefinition,
  type EngineBinding,
} from "@rosesfield/contract"
import { assetIdFormat, characterIdFormat } from "@rosesfield/kernel"
import type { z } from "zod"
import { taskBinding } from "#domain/task-binding"

type AppInput = z.input<typeof appDefinition>

export const start = new Date("2026-10-17T09:00:00.000Z")
export const referenceId = assetIdFormat.parse(
  "0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f"
)
export const portraitId = assetIdFormat.parse(
  "6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
)
export const characterId = characterIdFormat.parse(
  "7f6e5d4c-3b2a-4190-a8b7-c6d5e4f3a2b1"
)

export const fakeBinding: EngineBinding = { adapter: "fake-engine", config: {} }

export function imageApp(
  engine: EngineBinding = fakeBinding,
  limits: AppInput["limits"] = { timeoutSeconds: 600, maxRetries: 2 }
): AppDefinition {
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
      {
        type: "choice",
        name: "model",
        labelKey: "inputs.model",
        options: [
          { value: "open", labelKey: "model.open" },
          { value: "hosted", labelKey: "model.hosted" },
        ],
        default: "open",
      },
      { type: "seed", name: "seed", labelKey: "inputs.seed" },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "16:9"], default: "1:1" },
    },
    engine,
    limits,
  })
}

export function audioApp(engine: EngineBinding = fakeBinding): AppDefinition {
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
    engine,
    limits: { timeoutSeconds: 120, maxRetries: 0 },
  })
}

export function pngBytes(): Uint8Array {
  return Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
}

export const modesApp: AppDefinition = appDefinition.parse({
  id: "sample-modes",
  nameKey: "name",
  category: "image",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "inputs.mode",
      options: [
        { value: "portrait", labelKey: "mode.portrait" },
        { value: "views", labelKey: "mode.views" },
      ],
      default: "portrait",
    },
    {
      type: "choice",
      name: "model",
      labelKey: "inputs.model",
      options: [
        { value: "open-portrait", labelKey: "model.portrait" },
        { value: "open-views", labelKey: "model.views" },
      ],
      default: "open-portrait",
      bounds: [
        {
          when: [{ input: "mode", is: ["portrait"] }],
          values: ["open-portrait"],
        },
        { when: [{ input: "mode", is: ["views"] }], values: ["open-views"] },
      ],
    },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 4 },
    aspectRatios: { options: ["1:1"], default: "1:1" },
  },
  engine: taskBinding({
    tasks: ["text-to-image", "image-edit"],
    input: "model",
    default: "open-portrait",
    fallback: fakeBinding,
  }),
  limits: { timeoutSeconds: 600, maxRetries: 0 },
})
