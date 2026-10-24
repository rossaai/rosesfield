import { taskBinding } from "@rosesfield/generation/bindings"
import { type AppInput, defineApp } from "#define-app"
import { editBinding } from "#edit/comfy/edit-workflow"
import {
  defaultResolution,
  editAspectRatios,
  editModels,
  graphModel,
  modelLabels,
  photoAccept,
  resolutions,
} from "#edit/edit-models"

export const app: AppInput = defineApp({
  id: "edit",
  nameKey: "edit.name",
  category: "image",
  layout: "bar",
  inputs: [
    {
      type: "image",
      name: "image",
      labelKey: "edit.input.image.label",
      presence: "required",
      max: 1,
      accept: {
        formats: [...photoAccept.formats],
        maxBytes: photoAccept.maxBytes,
        minShortSide: photoAccept.minShortSide,
      },
    },
    {
      type: "prompt",
      name: "prompt",
      labelKey: "edit.input.prompt.label",
      presence: "required",
      maxLength: 2000,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "edit.input.model.label",
      options: editModels.map((value) => ({
        value,
        labelKey: modelLabels[value],
      })),
      default: graphModel,
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "edit.input.resolution.label",
      options: resolutions.map((value) => ({
        value,
        labelKey: `edit.choice.resolution.${value}`,
      })),
      default: defaultResolution,
    },
    { type: "seed", name: "seed", labelKey: "edit.input.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 4 },
    aspectRatios: { options: [...editAspectRatios], default: "1:1" },
  },
  engine: taskBinding({
    tasks: ["image-edit"],
    input: "model",
    default: graphModel,
    fallback: editBinding,
  }),
  limits: { timeoutSeconds: 600, maxRetries: 1 },
})
