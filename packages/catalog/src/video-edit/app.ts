import { type AppInput, defineApp } from "#define-app"
import {
  videoEditAspectRatios,
  videoEditEngine,
} from "#video-edit/comfy/video-edit-engine"

const inExtend = [{ input: "mode", is: ["extend"] }]
const inReframe = [{ input: "mode", is: ["reframe"] }]
const inBackground = [{ input: "mode", is: ["background"] }]
const inFrameRate = [{ input: "mode", is: ["frame-rate"] }]
const inExtendOrReframe = [{ input: "mode", is: ["extend", "reframe"] }]

export const app: AppInput = defineApp({
  id: "video-edit",
  nameKey: "videoEdit.name",
  category: "video",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "videoEdit.input.mode.label",
      options: [
        { value: "extend", labelKey: "videoEdit.choice.mode.extend" },
        { value: "reframe", labelKey: "videoEdit.choice.mode.reframe" },
        { value: "background", labelKey: "videoEdit.choice.mode.background" },
        { value: "frame-rate", labelKey: "videoEdit.choice.mode.frameRate" },
      ],
      default: "extend",
    },
    {
      type: "video",
      name: "source",
      labelKey: "videoEdit.input.source.label",
      presence: "required",
      max: 1,
    },
    {
      type: "number",
      name: "seconds",
      labelKey: "videoEdit.input.seconds.label",
      min: 1,
      max: 4,
      step: 1,
      default: 3,
      when: inExtend,
    },
    {
      type: "prompt",
      name: "next",
      labelKey: "videoEdit.input.next.label",
      presence: "optional",
      maxLength: 500,
      when: inExtend,
    },
    {
      type: "choice",
      name: "aspect",
      labelKey: "videoEdit.input.aspect.label",
      options: [
        { value: "1-1", labelKey: "videoEdit.choice.aspect.square" },
        { value: "4-3", labelKey: "videoEdit.choice.aspect.fourByThree" },
        { value: "3-4", labelKey: "videoEdit.choice.aspect.threeByFour" },
        { value: "16-9", labelKey: "videoEdit.choice.aspect.wide" },
        { value: "9-16", labelKey: "videoEdit.choice.aspect.tall" },
      ],
      default: "1-1",
      when: inReframe,
    },
    {
      type: "prompt",
      name: "around",
      labelKey: "videoEdit.input.around.label",
      presence: "optional",
      maxLength: 500,
      when: inReframe,
    },
    {
      type: "choice",
      name: "color",
      labelKey: "videoEdit.input.color.label",
      options: [
        { value: "green", labelKey: "videoEdit.choice.color.green" },
        { value: "white", labelKey: "videoEdit.choice.color.white" },
        { value: "black", labelKey: "videoEdit.choice.color.black" },
      ],
      default: "green",
      when: inBackground,
    },
    {
      type: "choice",
      name: "factor",
      labelKey: "videoEdit.input.factor.label",
      options: [
        { value: "2x", labelKey: "videoEdit.choice.factor.x2" },
        { value: "4x", labelKey: "videoEdit.choice.factor.x4" },
      ],
      default: "2x",
      when: inFrameRate,
    },
    {
      type: "toggle",
      name: "keepSound",
      labelKey: "videoEdit.input.keepSound.label",
      default: "on",
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "videoEdit.input.resolution.label",
      options: [
        { value: "480p", labelKey: "videoEdit.choice.resolution.p480" },
        { value: "720p", labelKey: "videoEdit.choice.resolution.p720" },
      ],
      default: "480p",
      when: inExtendOrReframe,
    },
    { type: "seed", name: "seed", labelKey: "videoEdit.input.seed.label" },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 1 },
    aspectRatios: { options: [...videoEditAspectRatios], default: "16:9" },
  },
  engine: videoEditEngine,
  limits: { timeoutSeconds: 1800, maxRetries: 2 },
})
