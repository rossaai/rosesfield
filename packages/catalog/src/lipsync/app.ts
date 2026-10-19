import { type AppInput, defineApp } from "#define-app"
import { lipsyncBinding, lipsyncModes } from "#lipsync/comfy/lipsync-binding"
import {
  lipsyncAspects,
  longestSeconds,
  secondsStep,
  shortestSeconds,
} from "#lipsync/comfy/lipsync-frames"

function labelOf(name: string): string {
  return `lipsync.input.${name}.label`
}

const fromPhoto = [{ input: "mode", is: ["photo"] }]
const fromClip = [{ input: "mode", is: ["clip"] }]

export const app: AppInput = defineApp({
  id: "lipsync",
  nameKey: "lipsync.name",
  category: "video",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: labelOf("mode"),
      options: lipsyncModes.map((value) => ({
        value,
        labelKey: `lipsync.choice.mode.${value}`,
      })),
      default: "photo",
    },
    {
      type: "image",
      name: "photo",
      labelKey: labelOf("photo"),
      presence: "required",
      max: 1,
      when: fromPhoto,
    },
    {
      type: "video",
      name: "clip",
      labelKey: labelOf("clip"),
      presence: "required",
      max: 1,
      when: fromClip,
    },
    {
      type: "audio",
      name: "audio",
      labelKey: labelOf("audio"),
      presence: "required",
      max: 1,
    },
    {
      type: "prompt",
      name: "scene",
      labelKey: labelOf("scene"),
      presence: "optional",
      maxLength: 500,
      when: fromPhoto,
    },
    {
      type: "number",
      name: "length",
      labelKey: labelOf("length"),
      min: shortestSeconds,
      max: longestSeconds,
      step: secondsStep,
      default: longestSeconds,
    },
    { type: "seed", name: "seed", labelKey: "field.seed.label" },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 1 },
    aspectRatios: { options: [...lipsyncAspects], default: "1:1" },
  },
  engine: lipsyncBinding,
  limits: { timeoutSeconds: 1800, maxRetries: 1 },
  preview: null,
})
