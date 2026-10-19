import { type AppInput, defineApp } from "#define-app"
import {
  upscaleAspectRatios,
  upscaleEngine,
} from "#upscale/comfy/upscale-engine"

export const app: AppInput = defineApp({
  id: "upscale",
  nameKey: "upscale.name",
  category: "image",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "upscale.input.mode.label",
      options: [
        { value: "image", labelKey: "upscale.choice.mode.image" },
        { value: "video", labelKey: "upscale.choice.mode.video" },
      ],
      default: "image",
    },
    {
      type: "image",
      name: "image",
      labelKey: "upscale.input.image.label",
      presence: "required",
      max: 1,
      when: [{ input: "mode", is: ["image"] }],
    },
    {
      type: "video",
      name: "video",
      labelKey: "upscale.input.video.label",
      presence: "required",
      max: 1,
      when: [{ input: "mode", is: ["video"] }],
    },
    {
      type: "choice",
      name: "scale",
      labelKey: "upscale.input.scale.label",
      options: [
        { value: "2x", labelKey: "upscale.choice.scale.x2" },
        { value: "4x", labelKey: "upscale.choice.scale.x4" },
      ],
      default: "2x",
    },
    {
      type: "choice",
      name: "model",
      labelKey: "upscale.input.model.label",
      options: [
        { value: "seedvr2-3b", labelKey: "upscale.model.seedvr23b" },
        { value: "seedvr2-7b", labelKey: "upscale.model.seedvr27b" },
        { value: "real-esrgan-4x", labelKey: "upscale.model.realEsrgan4x" },
      ],
      default: "seedvr2-3b",
    },
    { type: "seed", name: "seed", labelKey: "upscale.input.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 1 },
    aspectRatios: { options: [...upscaleAspectRatios], default: "1:1" },
  },
  engine: upscaleEngine,
  limits: { timeoutSeconds: 1800, maxRetries: 2 },
})
