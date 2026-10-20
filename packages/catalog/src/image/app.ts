import { taskBinding } from "@rosesfield/generation/bindings"
import { defineApp } from "#define-app"
import { imageBinding } from "#image/comfy/image-binding"
import { editReferenceLimit, referenceInput } from "#image/comfy/open-weights"
import {
  defaultModel,
  defaultResolution,
  firstModel,
  imageModels,
  referenceModel,
  resolutionKeyOf,
  resolutionsOf,
  resolutionValues,
} from "#image/image-models"

export const app = defineApp({
  id: "image",
  nameKey: "image.name",
  category: "image",
  inputs: [
    {
      type: "prompt",
      name: "prompt",
      labelKey: "image.input.prompt.label",
      presence: "required",
      maxLength: 2000,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "image.input.model.label",
      options: [
        ...imageModels.map((model) => ({
          value: model.value,
          labelKey: model.labelKey,
        })),
        { value: firstModel, labelKey: "image.model.flux3Image" },
      ],
      default: defaultModel,
    },
    {
      type: "image",
      name: referenceInput,
      labelKey: "video.well.references",
      presence: "required",
      max: editReferenceLimit,
      when: [{ input: "model", is: [referenceModel] }],
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "image.input.resolution.label",
      options: resolutionValues.map((value) => ({
        value,
        labelKey: resolutionKeyOf(value),
      })),
      default: defaultResolution,
      bounds: imageModels.map((model) => ({
        when: [{ input: "model", is: [model.value] }],
        values: resolutionsOf(model),
      })),
    },
    { type: "seed", name: "seed", labelKey: "image.input.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 4 },
    aspectRatios: {
      options: ["1:1", "4:3", "3:4", "16:9", "9:16"],
      default: "1:1",
    },
  },
  engine: taskBinding({
    tasks: ["text-to-image"],
    input: "model",
    default: defaultModel,
    fallback: imageBinding,
  }),
  limits: { timeoutSeconds: 600, maxRetries: 2 },
})
