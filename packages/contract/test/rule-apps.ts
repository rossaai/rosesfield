import type { z } from "zod"
import { appDefinition } from "#app.contract"
import { sampleApp } from "./sample"

type AppInput = z.input<typeof appDefinition>
export type Inputs = AppInput["inputs"]

export function appWith(inputs: Inputs): AppInput {
  return { ...sampleApp(), inputs }
}

export const modeApp = appDefinition.parse(
  appWith([
    {
      type: "choice",
      name: "mode",
      labelKey: "inputs.mode",
      options: [
        { value: "character", labelKey: "mode.character" },
        { value: "object", labelKey: "mode.object" },
      ],
      default: "character",
    },
    {
      type: "character",
      name: "character",
      labelKey: "inputs.character",
      presence: "required",
      max: 1,
      when: [{ input: "mode", is: ["character"] }],
    },
    {
      type: "prompt",
      name: "target",
      labelKey: "inputs.target",
      presence: "required",
      maxLength: 80,
      when: [{ input: "mode", is: ["object"] }],
    },
  ])
)

export const modelApp = appDefinition.parse(
  appWith([
    {
      type: "choice",
      name: "model",
      labelKey: "inputs.model",
      options: [
        { value: "first-model", labelKey: "model.first" },
        { value: "second-model", labelKey: "model.second" },
      ],
      default: "first-model",
    },
    {
      type: "image",
      name: "startFrame",
      labelKey: "inputs.startFrame",
      presence: "required",
      max: 1,
      when: [{ input: "model", is: ["second-model"] }],
    },
    {
      type: "number",
      name: "length",
      labelKey: "inputs.length",
      min: 2,
      max: 10,
      step: 1,
      default: 5,
      bounds: [
        { when: [{ input: "model", is: ["second-model"] }], min: 5, max: 5 },
      ],
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "inputs.resolution",
      options: [
        { value: "480p", labelKey: "resolution.p480" },
        { value: "720p", labelKey: "resolution.p720" },
      ],
      default: "720p",
      bounds: [
        { when: [{ input: "model", is: ["second-model"] }], values: ["480p"] },
      ],
    },
    {
      type: "toggle",
      name: "sound",
      labelKey: "inputs.sound",
      default: "on",
      bounds: [
        { when: [{ input: "model", is: ["second-model"] }], values: ["off"] },
      ],
    },
  ])
)

export const eitherApp = appDefinition.parse(
  appWith([
    {
      type: "prompt",
      name: "prompt",
      labelKey: "inputs.prompt",
      presence: "required",
      maxLength: 200,
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
      when: [{ input: "references", state: "empty" }],
    },
  ])
)
