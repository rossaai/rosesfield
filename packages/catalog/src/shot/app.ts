import { taskBinding } from "@rosesfield/generation/bindings"
import { type AppInput, defineApp } from "#define-app"
import { shotGraphs, shotResolutions } from "#shot/comfy/shot-binding"
import {
  autoValue,
  keyOf,
  type ShotList,
  shotListOrder,
  shotLists,
} from "#shot/shot-words"
import { videoAspects, videoLengths } from "#video/comfy/video-sizes"
import { graphModel } from "#video/video-models"

type InputEntry = AppInput["inputs"][number]

export const shotTasks: readonly string[] = ["text-to-video", "image-to-video"]

const defaultLength = 5

function choiceOf(list: ShotList): InputEntry {
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
  }
}

export const app: AppInput = defineApp({
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
      options: [{ value: graphModel, labelKey: "shot.model.ltx25.name" }],
      default: graphModel,
    },
    ...shotListOrder.map(choiceOf),
    {
      type: "number",
      name: "length",
      labelKey: "shot.input.length.label",
      min: Math.min(...videoLengths),
      max: Math.max(...videoLengths),
      step: 1,
      default: defaultLength,
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "shot.input.resolution.label",
      options: shotResolutions.map((value) => ({
        value,
        labelKey: `shot.choice.resolution.r${value}`,
      })),
      default: "480p",
    },
    {
      type: "toggle",
      name: "sound",
      labelKey: "shot.input.sound.label",
      default: "on",
    },
    { type: "seed", name: "seed", labelKey: "shot.input.seed.label" },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 4 },
    aspectRatios: { options: [...videoAspects], default: "16:9" },
  },
  engine: taskBinding({
    tasks: shotTasks,
    input: "model",
    default: graphModel,
    fallback: shotGraphs,
  }),
  limits: { timeoutSeconds: 1800, maxRetries: 1 },
})
