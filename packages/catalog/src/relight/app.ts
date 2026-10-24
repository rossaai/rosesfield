import { type AppInput, defineApp } from "#define-app"
import {
  defaultRelightModel,
  relightBinding,
  relightModels,
} from "#relight/comfy/relight-binding"
import {
  autoValue,
  brightnessSteps,
  relightLists,
} from "#relight/relight-words"

export const relightAspectRatios = [
  "7:3",
  "2:1",
  "16:9",
  "5:3",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "3:5",
  "9:16",
  "1:2",
  "3:7",
]

const modelLabels: Readonly<Record<(typeof relightModels)[number], string>> = {
  "qwen-image-edit-2509-relight": "relight.model.qwenImageEdit2509Relight",
}

function choiceOptions(list: keyof typeof relightLists) {
  return [
    { value: autoValue, labelKey: "choice.auto" },
    ...relightLists[list].map((value) => ({
      value,
      labelKey: `relight.choice.${list}.${value}`,
    })),
  ]
}

export const app: AppInput = defineApp({
  id: "relight",
  nameKey: "relight.name",
  category: "image",
  layout: "bar",
  inputs: [
    {
      type: "image",
      name: "image",
      labelKey: "relight.input.image.label",
      presence: "required",
      max: 1,
    },
    {
      type: "choice",
      name: "direction",
      labelKey: "relight.input.direction.label",
      options: choiceOptions("direction"),
      default: autoValue,
    },
    {
      type: "choice",
      name: "softness",
      labelKey: "relight.input.softness.label",
      options: choiceOptions("softness"),
      default: autoValue,
    },
    {
      type: "choice",
      name: "color",
      labelKey: "relight.input.color.label",
      options: choiceOptions("color"),
      default: autoValue,
    },
    {
      type: "number",
      name: "brightness",
      labelKey: "relight.input.brightness.label",
      min: Math.min(...brightnessSteps),
      max: Math.max(...brightnessSteps),
      step: 1,
      default: 0,
    },
    {
      type: "prompt",
      name: "prompt",
      labelKey: "relight.input.prompt.label",
      presence: "optional",
      maxLength: 300,
    },
    {
      type: "choice",
      name: "quality",
      labelKey: "relight.input.quality.label",
      options: [
        { value: "draft", labelKey: "choice.quality.draft" },
        { value: "final", labelKey: "choice.quality.final" },
      ],
      default: "draft",
    },
    {
      type: "choice",
      name: "model",
      labelKey: "relight.input.model.label",
      options: relightModels.map((value) => ({
        value,
        labelKey: modelLabels[value],
      })),
      default: defaultRelightModel,
    },
    { type: "seed", name: "seed", labelKey: "relight.input.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 4 },
    aspectRatios: { options: [...relightAspectRatios], default: "1:1" },
  },
  engine: relightBinding,
  limits: { timeoutSeconds: 300, maxRetries: 0 },
})
