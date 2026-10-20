import { taskBinding } from "@rosesfield/generation/bindings"
import { type AppInput, defineApp } from "#define-app"
import { cameraMoves } from "#video/camera-moves"
import { videoEngine } from "#video/comfy/video-engine"
import { videoAspects } from "#video/comfy/video-sizes"
import {
  defaultModel,
  graphModel,
  hostedModel,
  videoTasks,
} from "#video/video-models"

const runSeconds = 1500
const queueSeconds = 300

export const app: AppInput = defineApp({
  id: "video",
  nameKey: "video.name",
  category: "video",
  inputs: [
    {
      type: "prompt",
      name: "prompt",
      labelKey: "video.input.prompt.label",
      presence: "required",
      maxLength: 1000,
    },
    {
      type: "image",
      name: "startFrame",
      labelKey: "video.input.startFrame.label",
      presence: "optional",
      max: 1,
    },
    {
      type: "image",
      name: "lastFrame",
      labelKey: "video.well.last",
      presence: "optional",
      max: 1,
      when: [{ input: "startFrame", state: "filled" }],
    },
    {
      type: "choice",
      name: "model",
      labelKey: "video.input.model.label",
      options: [
        { value: graphModel, labelKey: "video.model.ltx25" },
        { value: hostedModel, labelKey: "video.model.minimaxH3" },
      ],
      default: defaultModel,
    },
    {
      type: "number",
      name: "length",
      labelKey: "video.input.length.label",
      min: 2,
      max: 5,
      step: 1,
      default: 5,
    },
    {
      type: "choice",
      name: "cameraMove",
      labelKey: "video.input.cameraMove.label",
      options: cameraMoves.map((move) => ({
        value: move.value,
        labelKey: move.labelKey,
      })),
      default: "auto",
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "video.input.resolution.label",
      options: [
        { value: "480p", labelKey: "video.choice.resolution.p480" },
        { value: "720p", labelKey: "video.choice.resolution.p720" },
      ],
      default: "480p",
    },
    {
      type: "toggle",
      name: "sound",
      labelKey: "video.input.sound.label",
      default: "on",
    },
    { type: "seed", name: "seed", labelKey: "video.input.seed.label" },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 1 },
    aspectRatios: { options: [...videoAspects], default: "16:9" },
  },
  engine: taskBinding({
    tasks: videoTasks,
    input: "model",
    default: defaultModel,
    fallback: videoEngine,
  }),
  limits: { timeoutSeconds: runSeconds + queueSeconds, maxRetries: 1 },
})
