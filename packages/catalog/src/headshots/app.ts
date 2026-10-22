import { type AppInput, defineApp } from "#define-app"
import { headshotsBinding } from "#headshots/comfy/headshots-binding"
import {
  backgrounds,
  clothesValues,
  defaultHeadshots,
  framings,
  headshotRatios,
  keyOf,
  maxHeadshots,
} from "#headshots/headshots-values"

type Input = AppInput["inputs"][number]

function choice(
  name: string,
  values: readonly string[],
  fallback: string,
  labelOf: (value: string) => string = (value) =>
    `headshots.choice.${name}.${keyOf(value)}`
): Input {
  return {
    type: "choice",
    name,
    labelKey: `headshots.input.${name}.label`,
    options: values.map((value) => ({ value, labelKey: labelOf(value) })),
    default: fallback,
  }
}

export const app = defineApp({
  id: "headshots",
  nameKey: "headshots.name",
  category: "image",
  inputs: [
    {
      type: "image",
      name: "image",
      labelKey: "headshots.input.image.label",
      presence: "required",
      max: 1,
    },
    choice("background", backgrounds, "grey"),
    choice("clothes", clothesValues, "keep"),
    choice("framing", framings, "standard"),
    {
      type: "toggle",
      name: "keepGlasses",
      labelKey: "headshots.input.keepGlasses.label",
      default: "on",
    },
    { type: "seed", name: "seed", labelKey: "field.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: defaultHeadshots, max: maxHeadshots },
    aspectRatios: { options: [...headshotRatios], default: "1:1" },
  },
  engine: headshotsBinding(),
  limits: { timeoutSeconds: 1200, maxRetries: 1 },
  preview: null,
})
