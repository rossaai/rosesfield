import { type AppInput, defineApp } from "#define-app"
import { keyframeAspects } from "#storyboard/comfy/keyframe-sizes"
import { storyboardBinding } from "#storyboard/comfy/storyboard-binding"
import { storyboardAppId } from "#storyboard/keyframe-facts"
import {
  countsFrom,
  lookMaxLength,
  maxScenes,
  modelKeyOf,
  sceneCountInput,
  sceneCounts,
  sceneCountWord,
  sceneInputName,
  sceneMaxLength,
  sceneNumbers,
  storyboardModels,
} from "#storyboard/storyboard-inputs"

type Input = AppInput["inputs"][number]

const sceneCount: Input = {
  type: "choice",
  name: sceneCountInput,
  labelKey: "storyboard.input.sceneCount.label",
  options: sceneCounts.map((value) => ({
    value,
    labelKey: `storyboard.choice.sceneCount.${sceneCountWord(Number(value))}`,
    count: Number(value),
  })),
  default: "1",
}

const sceneInputs: Input[] = sceneNumbers.map(
  (number): Input => ({
    type: "prompt",
    name: sceneInputName(number),
    labelKey: "storyboard.input.scenes.label",
    presence: "required",
    maxLength: sceneMaxLength,
    ...(number === 1
      ? {}
      : { when: [{ input: sceneCountInput, is: countsFrom(number) }] }),
  })
)

export const app: AppInput = defineApp({
  id: storyboardAppId,
  nameKey: "storyboard.name",
  category: "image",
  inputs: [
    {
      type: "image",
      name: "reference",
      labelKey: "storyboard.input.reference.label",
      presence: "optional",
      max: 1,
    },
    {
      type: "character",
      name: "character",
      labelKey: "storyboard.input.character.label",
      presence: "optional",
      max: 1,
      when: [{ input: "reference", state: "empty" }],
    },
    sceneCount,
    ...sceneInputs,
    {
      type: "prompt",
      name: "look",
      labelKey: "storyboard.input.look.label",
      presence: "optional",
      maxLength: lookMaxLength,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "storyboard.input.model.label",
      options: storyboardModels.map((model) => ({
        value: model,
        labelKey: `storyboard.model.${modelKeyOf(model)}`,
      })),
      default: "qwen-image-edit-2511",
    },
    { type: "seed", name: "seed", labelKey: "storyboard.input.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: maxScenes },
    aspectRatios: { options: [...keyframeAspects], default: "16:9" },
  },
  engine: storyboardBinding,
  limits: { timeoutSeconds: 1200, maxRetries: 2 },
})
