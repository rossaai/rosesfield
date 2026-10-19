import {
  backgroundRemovalAspectRatios,
  backgroundRemovalEngine,
} from "#background-removal/comfy/background-removal-engine"
import { type AppInput, defineApp } from "#define-app"

export const app: AppInput = defineApp({
  id: "background-removal",
  nameKey: "backgroundRemoval.name",
  category: "image",
  inputs: [
    {
      type: "image",
      name: "image",
      labelKey: "backgroundRemoval.input.image.label",
      presence: "required",
      max: 1,
    },
    {
      type: "choice",
      name: "background",
      labelKey: "backgroundRemoval.input.background.label",
      options: [
        {
          value: "transparent",
          labelKey: "backgroundRemoval.choice.background.transparent",
        },
        {
          value: "white",
          labelKey: "backgroundRemoval.choice.background.white",
        },
        {
          value: "black",
          labelKey: "backgroundRemoval.choice.background.black",
        },
      ],
      default: "transparent",
    },
    {
      type: "choice",
      name: "model",
      labelKey: "backgroundRemoval.input.model.label",
      options: [
        { value: "birefnet", labelKey: "backgroundRemoval.model.birefnet" },
        { value: "lucida", labelKey: "backgroundRemoval.model.lucida" },
      ],
      default: "birefnet",
    },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 1 },
    aspectRatios: {
      options: [...backgroundRemovalAspectRatios],
      default: "1:1",
    },
  },
  engine: backgroundRemovalEngine,
  limits: { timeoutSeconds: 300, maxRetries: 1 },
})
