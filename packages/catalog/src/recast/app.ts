import { type AppInput, defineApp } from "#define-app"
import { recastAspectRatios, recastEngine } from "#recast/comfy/recast-engine"

const inCharacterMode = [{ input: "mode", is: ["character"] }]
const inObjectMode = [{ input: "mode", is: ["object"] }]

export const app: AppInput = defineApp({
  id: "recast",
  nameKey: "recast.name",
  category: "video",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "recast.input.mode.label",
      options: [
        { value: "character", labelKey: "recast.choice.mode.character" },
        { value: "object", labelKey: "recast.choice.mode.object" },
      ],
      default: "character",
    },
    {
      type: "video",
      name: "source",
      labelKey: "recast.input.source.label",
      presence: "required",
      max: 1,
    },
    {
      type: "character",
      name: "character",
      labelKey: "recast.input.character.label",
      presence: "required",
      max: 1,
      when: inCharacterMode,
    },
    {
      type: "prompt",
      name: "target",
      labelKey: "recast.input.target.label",
      presence: "required",
      maxLength: 80,
      when: inObjectMode,
    },
    {
      type: "prompt",
      name: "prompt",
      labelKey: "recast.input.prompt.label",
      presence: "required",
      maxLength: 500,
      when: inObjectMode,
    },
    {
      type: "toggle",
      name: "keepSound",
      labelKey: "recast.input.keepSound.label",
      default: "on",
    },
    {
      type: "choice",
      name: "quality",
      labelKey: "recast.input.quality.label",
      options: [
        { value: "draft", labelKey: "choice.quality.draft" },
        { value: "final", labelKey: "choice.quality.final" },
      ],
      default: "draft",
    },
    { type: "seed", name: "seed", labelKey: "recast.input.seed.label" },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 1 },
    aspectRatios: { options: [...recastAspectRatios], default: "16:9" },
  },
  engine: recastEngine,
  limits: { timeoutSeconds: 1800, maxRetries: 2 },
})
