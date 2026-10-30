import { taskBinding } from "@rosesfield/generation/bindings"
import { photoInput } from "#ai-influencer/sheet-prompt"
import {
  detailsInput,
  promptInput,
  sheetAspect,
} from "#ai-influencer/sheet-run"
import {
  anyValue,
  camelOf,
  slotNamesOf,
  type TraitSection,
  traitSections,
} from "#ai-influencer/traits"
import { type AppInput, defineApp } from "#define-app"
import { photoAccept } from "#edit/edit-models"
import { imageBinding } from "#image/comfy/image-binding"
import {
  firstModel,
  imageModels,
  referenceModel,
  resolutionKeyOf,
  resolutionsOf,
  resolutionValues,
} from "#image/image-models"

type Input = AppInput["inputs"][number]

/** The model the four characters the operator chose as the bar were made on, so the app opens on it. */
export const sheetModel = "z-image-turbo"

/** The model a run with a photo of you takes: Image's edit graph, the image-edit task Edit runs. */
export const photoModel = referenceModel

const textTask = "text-to-image"

const editTask = "image-edit"

export function optionKeyOf(section: string, value: string): string {
  return value === anyValue
    ? "aiInfluencer.choice.any"
    : `aiInfluencer.choice.${section}.${camelOf(value)}`
}

function traitInputsOf(section: TraitSection): Input[] {
  return slotNamesOf(section).map((name) => ({
    type: "choice",
    name,
    scope: "app",
    labelKey: `aiInfluencer.input.${name}.label`,
    options: section.values.map((value) => ({
      value,
      labelKey: optionKeyOf(section.name, value),
    })),
    default: anyValue,
  }))
}

export const app = defineApp({
  id: "ai-influencer",
  nameKey: "aiInfluencer.name",
  category: "character",
  inputs: [
    ...traitSections.flatMap(traitInputsOf),
    {
      type: "prompt",
      name: detailsInput,
      scope: "app",
      labelKey: "aiInfluencer.input.details.label",
      presence: "optional",
      maxLength: 300,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "aiInfluencer.input.model.label",
      options: [
        ...imageModels.map((model) => ({
          value: model.value,
          labelKey: model.labelKey,
        })),
        { value: firstModel, labelKey: "image.model.flux3Image" },
      ],
      default: sheetModel,
    },
    {
      type: "image",
      name: photoInput,
      labelKey: "aiInfluencer.input.photo.label",
      presence: "required",
      max: 1,
      accept: {
        formats: [...photoAccept.formats],
        maxBytes: photoAccept.maxBytes,
        minShortSide: photoAccept.minShortSide,
      },
      when: [{ input: "model", is: [referenceModel] }],
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "aiInfluencer.input.resolution.label",
      options: resolutionValues.map((value) => ({
        value,
        labelKey: resolutionKeyOf(value),
      })),
      default: "1k",
      bounds: imageModels.map((model) => ({
        when: [{ input: "model", is: [model.value] }],
        values: resolutionsOf(model),
      })),
    },
    {
      type: "prompt",
      name: promptInput,
      labelKey: "aiInfluencer.input.prompt.label",
      presence: "required",
      maxLength: 4000,
    },
    { type: "seed", name: "seed", labelKey: "field.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 1 },
    aspectRatios: { options: [sheetAspect], default: sheetAspect },
  },
  engine: taskBinding({
    tasks: [textTask, editTask],
    input: "model",
    default: sheetModel,
    fallback: imageBinding,
    graphTasks: Object.fromEntries(
      imageModels.map((model) => [
        model.value,
        model.value === referenceModel ? editTask : textTask,
      ])
    ),
  }),
  limits: { timeoutSeconds: 600, maxRetries: 2 },
})
