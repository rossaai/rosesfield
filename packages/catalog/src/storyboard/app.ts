import { type AppInput, defineApp } from "#define-app"
import { keyframeAspects } from "#storyboard/comfy/keyframe-sizes"
import {
  keyframeTextModel,
  storyboardEngine,
} from "#storyboard/comfy/storyboard-binding"
import { storyboardAppId } from "#storyboard/keyframe-facts"
import {
  countsFrom,
  editModel,
  firstKeyframeInput,
  keyframeInput,
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
  })),
  default: "1",
}

const keyframeBounds = [
  ...sceneCounts.map((count) => ({
    when: [{ input: sceneCountInput, is: [count] }],
    values: sceneCounts.slice(0, Number(count)),
  })),
  ...(keyframeTextModel === null
    ? []
    : [
        {
          when: [{ input: "model", is: [keyframeTextModel.value] }],
          values: ["1"],
        },
      ]),
]

const keyframe: Input = {
  type: "choice",
  name: keyframeInput,
  labelKey: "storyboard.keyframe.number",
  options: sceneCounts.map((value) => ({
    value,
    labelKey: "storyboard.keyframe.number",
    count: 1,
  })),
  default: "1",
  bounds: keyframeBounds,
}

const firstKeyframe: Input = {
  type: "image",
  name: firstKeyframeInput,
  labelKey: "storyboard.anchor.keyframe",
  presence: "required",
  max: 1,
  when: [
    { input: "reference", state: "empty" },
    { input: "character", state: "empty" },
    { input: "model", is: [editModel] },
  ],
}

const textOption =
  keyframeTextModel === null
    ? []
    : [
        {
          value: keyframeTextModel.value,
          labelKey: keyframeTextModel.labelKey,
        },
      ]

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
      options: [
        ...storyboardModels.map((model) => ({
          value: model,
          labelKey: `storyboard.model.${modelKeyOf(model)}`,
        })),
        ...textOption,
      ],
      default: editModel,
    },
    keyframe,
    firstKeyframe,
    { type: "seed", name: "seed", labelKey: "storyboard.input.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: maxScenes },
    aspectRatios: { options: [...keyframeAspects], default: "16:9" },
  },
  engine: storyboardEngine,
  limits: { timeoutSeconds: 600, maxRetries: 2 },
})
