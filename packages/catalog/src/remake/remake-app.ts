import { type AppInput, defineApp } from "#define-app"
import { remakeAspectRatios, remakeEngine } from "#remake/comfy/remake-engine"
import { remakeLimits } from "#remake/shot-plan"

export const app: AppInput = defineApp({
  id: "remake",
  nameKey: "remake.name",
  category: "video",
  inputs: [
    {
      type: "video",
      name: "reference",
      labelKey: "remake.input.reference.label",
      presence: "required",
      max: 1,
    },
    {
      type: "character",
      name: "character",
      labelKey: "remake.input.character.label",
      presence: "required",
      max: 1,
    },
    {
      type: "prompt",
      name: "instructions",
      labelKey: "remake.input.instructions.label",
      presence: "optional",
      maxLength: remakeLimits.longestWords,
    },
    {
      type: "choice",
      name: "otherShots",
      labelKey: "remake.input.otherShots.label",
      options: [
        { value: "rebuild", labelKey: "remake.choice.otherShots.rebuild" },
        { value: "keep", labelKey: "remake.choice.otherShots.keep" },
      ],
      default: "rebuild",
    },
    {
      type: "toggle",
      name: "keepSound",
      labelKey: "remake.input.keepSound.label",
      default: "on",
    },
    {
      type: "choice",
      name: "quality",
      labelKey: "remake.input.quality.label",
      options: [
        { value: "draft", labelKey: "choice.quality.draft" },
        { value: "final", labelKey: "choice.quality.final" },
      ],
      default: "draft",
    },
    { type: "seed", name: "seed", labelKey: "field.seed.label" },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 1 },
    aspectRatios: { options: [...remakeAspectRatios], default: "16:9" },
  },
  engine: remakeEngine,
  limits: { timeoutSeconds: 3600, maxRetries: 1 },
})
