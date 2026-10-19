import { defineApp } from "#define-app"
import {
  defaultEffect,
  effectKeyOf,
  effectValues,
} from "#effects/comfy/effect-prompts"
import { effectsWithSound } from "#effects/comfy/effect-recipes"
import { effectsBinding } from "#effects/comfy/effects-binding"
import { effectRatios } from "#effects/comfy/frame-sizes"

export const app = defineApp({
  id: "effects",
  nameKey: "effects.name",
  category: "video",
  inputs: [
    {
      type: "choice",
      name: "effect",
      labelKey: "effects.input.effect.label",
      options: effectValues.map((value) => ({
        value,
        labelKey: `effects.choice.effect.${effectKeyOf(value)}`,
      })),
      default: defaultEffect,
    },
    {
      type: "image",
      name: "image",
      labelKey: "effects.input.image.label",
      presence: "required",
      max: 1,
    },
    {
      type: "prompt",
      name: "prompt",
      labelKey: "effects.input.prompt.label",
      presence: "optional",
      maxLength: 300,
    },
    {
      type: "number",
      name: "length",
      labelKey: "effects.input.length.label",
      min: 3,
      max: 5,
      step: 1,
      default: 5,
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "effects.input.resolution.label",
      options: [
        { value: "480p", labelKey: "effects.choice.resolution.p480" },
        { value: "720p", labelKey: "effects.choice.resolution.p720" },
      ],
      default: "720p",
    },
    {
      type: "toggle",
      name: "sound",
      labelKey: "effects.input.sound.label",
      default: "off",
      when: [{ input: "effect", is: [...effectsWithSound] }],
    },
    { type: "seed", name: "seed", labelKey: "effects.input.seed.label" },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 1 },
    aspectRatios: { options: [...effectRatios], default: "16:9" },
  },
  engine: effectsBinding,
  limits: { timeoutSeconds: 900, maxRetries: 1 },
  preview: null,
})
