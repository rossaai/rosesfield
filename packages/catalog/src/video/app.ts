import { type AppInput, defineApp } from "#define-app"
import { cameraMoves } from "#video/camera-moves"
import { videoEngine } from "#video/comfy/video-engine"
import { videoAspects } from "#video/comfy/video-sizes"

const clipModel = "wan-2-2"
const soundModels: readonly string[] = ["auto", "ltx-2-5"]
const maxCount = 4
const outputSeconds = 600
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
      type: "video",
      name: "clip",
      labelKey: "video.input.clip.label",
      presence: "optional",
      max: 1,
      when: [{ input: "startFrame", state: "empty" }],
    },
    {
      type: "choice",
      name: "model",
      labelKey: "video.input.model.label",
      options: [
        { value: "auto", labelKey: "choice.auto" },
        { value: "ltx-2-5", labelKey: "video.choice.model.ltx25" },
        { value: "wan-2-2", labelKey: "video.choice.model.wan22" },
      ],
      default: "auto",
      bounds: [
        { when: [{ input: "clip", state: "filled" }], values: [clipModel] },
      ],
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
      when: [{ input: "clip", state: "empty" }],
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "video.input.resolution.label",
      options: [
        { value: "480p", labelKey: "video.choice.resolution.p480" },
        { value: "720p", labelKey: "video.choice.resolution.p720" },
      ],
      default: "720p",
      bounds: [
        { when: [{ input: "model", is: [clipModel] }], values: ["480p"] },
      ],
    },
    {
      type: "toggle",
      name: "sound",
      labelKey: "video.input.sound.label",
      default: "off",
      when: [{ input: "model", is: [...soundModels] }],
    },
    { type: "seed", name: "seed", labelKey: "video.input.seed.label" },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: maxCount },
    aspectRatios: { options: [...videoAspects], default: "16:9" },
  },
  engine: videoEngine,
  limits: {
    timeoutSeconds: maxCount * outputSeconds + queueSeconds,
    maxRetries: 1,
  },
})
