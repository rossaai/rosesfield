import { type AppInput, defineApp } from "#define-app"
import { shotBinding } from "#shot/comfy/shot-binding"
import {
  defaultShotModel,
  lengthBounds,
  modelBounds,
  movementBounds,
  resolutionBounds,
  shotModelIds,
  shotResolutions,
  soundWhen,
} from "#shot/shot-models"
import {
  autoValue,
  keyOf,
  type ShotList,
  shotListOrder,
  shotLists,
} from "#shot/shot-words"

type InputEntry = AppInput["inputs"][number]

function choiceOf(list: ShotList): InputEntry {
  const bounds = list === "movement" ? { bounds: movementBounds } : {}
  return {
    type: "choice",
    name: list,
    labelKey: `shot.input.${list}.label`,
    options: [
      { value: autoValue, labelKey: "choice.auto" },
      ...shotLists[list].map((value) => ({
        value,
        labelKey: `shot.choice.${list}.${keyOf(value)}`,
      })),
    ],
    default: autoValue,
    ...bounds,
  }
}

export const app = defineApp({
  id: "shot",
  nameKey: "shot.name",
  category: "video",
  inputs: [
    {
      type: "prompt",
      name: "prompt",
      labelKey: "shot.input.prompt.label",
      presence: "required",
      maxLength: 1000,
    },
    {
      type: "image",
      name: "startFrame",
      labelKey: "shot.input.startFrame.label",
      presence: "optional",
      max: 1,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "shot.input.model.label",
      options: shotModelIds.map((id) => ({
        value: id,
        labelKey: `shot.model.${keyOf(id)}.name`,
      })),
      default: defaultShotModel,
      bounds: modelBounds,
    },
    ...shotListOrder.map(choiceOf),
    {
      type: "number",
      name: "length",
      labelKey: "shot.input.length.label",
      min: 2,
      max: 10,
      step: 1,
      default: 5,
      bounds: lengthBounds,
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "shot.input.resolution.label",
      options: shotResolutions.map((value) => ({
        value,
        labelKey: `shot.choice.resolution.r${value}`,
      })),
      default: "720p",
      bounds: resolutionBounds,
    },
    {
      type: "toggle",
      name: "sound",
      labelKey: "shot.input.sound.label",
      default: "on",
      when: soundWhen,
    },
    { type: "seed", name: "seed", labelKey: "shot.input.seed.label" },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 4 },
    aspectRatios: {
      options: ["1:1", "4:3", "3:4", "16:9", "9:16"],
      default: "16:9",
    },
  },
  engine: shotBinding,
  limits: { timeoutSeconds: 1800, maxRetries: 1 },
})
