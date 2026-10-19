import { type AppInput, defineApp } from "#define-app"
import {
  type TryOnModel,
  tryOnAspectRatios,
  tryOnEngine,
  tryOnModels,
} from "#try-on/comfy/try-on-binding"

const modelLabels: Readonly<Record<TryOnModel, string>> = {
  "qwen-image-edit-2511": "tryOn.model.qwenImageEdit2511",
  "qwen-image-edit-2511-lightning": "tryOn.model.qwenImageEdit2511Lightning",
  "flux2-klein-4b": "tryOn.model.flux2Klein4b",
}

export const app: AppInput = defineApp({
  id: "try-on",
  nameKey: "tryOn.name",
  category: "image",
  inputs: [
    {
      type: "image",
      name: "person",
      labelKey: "tryOn.input.person.label",
      presence: "required",
      max: 1,
    },
    {
      type: "image",
      name: "clothes",
      labelKey: "tryOn.input.clothes.label",
      presence: "required",
      max: 1,
    },
    {
      type: "choice",
      name: "part",
      labelKey: "tryOn.input.part.label",
      options: [
        { value: "all", labelKey: "tryOn.choice.part.all" },
        { value: "top", labelKey: "tryOn.choice.part.top" },
        { value: "bottom", labelKey: "tryOn.choice.part.bottom" },
      ],
      default: "all",
    },
    {
      type: "choice",
      name: "model",
      labelKey: "tryOn.input.model.label",
      options: tryOnModels.map((value) => ({
        value,
        labelKey: modelLabels[value],
      })),
      default: "qwen-image-edit-2511",
    },
    { type: "seed", name: "seed", labelKey: "tryOn.input.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 1 },
    aspectRatios: { options: [...tryOnAspectRatios], default: "3:4" },
  },
  engine: tryOnEngine,
  limits: { timeoutSeconds: 600, maxRetries: 1 },
})
