import { type AppInput, defineApp } from "#define-app"
import {
  canvasRatios,
  type ExpandFormat,
  expandBinding,
  expandFormats,
  expandModes,
} from "#expand/comfy/expand-binding"

const inFormat = [{ input: "mode", is: ["format"] }]
const inSides = [{ input: "mode", is: ["sides"] }]

const formatKeys: Readonly<Record<ExpandFormat, string>> = {
  "1-1": "square",
  "4-3": "fourByThree",
  "3-4": "threeByFour",
  "16-9": "wide",
  "9-16": "tall",
}

function side(name: "top" | "right" | "bottom" | "left") {
  return {
    type: "number",
    name,
    labelKey: `expand.input.${name}.label`,
    min: 0,
    max: 100,
    step: 5,
    default: 0,
    when: inSides,
  } as const
}

export const app: AppInput = defineApp({
  id: "expand",
  nameKey: "expand.name",
  category: "image",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "expand.input.mode.label",
      options: expandModes.map((value) => ({
        value,
        labelKey: `expand.choice.mode.${value}`,
      })),
      default: "format",
    },
    {
      type: "image",
      name: "photo",
      labelKey: "expand.input.photo.label",
      presence: "required",
      max: 1,
    },
    {
      type: "choice",
      name: "aspect",
      labelKey: "expand.input.aspect.label",
      options: expandFormats.map((value) => ({
        value,
        labelKey: `expand.choice.aspect.${formatKeys[value]}`,
      })),
      default: "16-9",
      when: inFormat,
    },
    side("top"),
    side("right"),
    side("bottom"),
    side("left"),
    {
      type: "prompt",
      name: "scene",
      labelKey: "expand.input.scene.label",
      presence: "optional",
      maxLength: 500,
    },
    { type: "seed", name: "seed", labelKey: "expand.input.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 4 },
    aspectRatios: { options: [...canvasRatios], default: "16:9" },
  },
  engine: expandBinding,
  limits: { timeoutSeconds: 600, maxRetries: 2 },
})
