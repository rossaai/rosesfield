import { taskBinding } from "@rosesfield/generation/bindings"
import {
  angleSets,
  distances,
  heights,
  keyOf,
  type Mode,
  modes,
  sides,
  viewCountOf,
  viewsPerSet,
} from "#angles/angle-views"
import { anglesBinding } from "#angles/comfy/angles-workflows"
import { type AppInput, defineApp } from "#define-app"
import { graphModel } from "#edit/edit-models"

type Input = AppInput["inputs"][number]
type When = NonNullable<Extract<Input, { type: "choice" }>["when"]>

function inMode(mode: Mode): When {
  return [{ input: "mode", is: [mode] }]
}

function choice(
  name: string,
  values: readonly string[],
  fallback: string,
  when?: When
): Input {
  return {
    type: "choice",
    name,
    labelKey: `angles.input.${name}.label`,
    options: values.map((value) => ({
      value,
      labelKey: `angles.choice.${name}.${keyOf(value)}`,
    })),
    default: fallback,
    ...(when === undefined ? {} : { when }),
  }
}

const mode: Input = {
  type: "choice",
  name: "mode",
  labelKey: "angles.input.mode.label",
  options: modes.map((value) => ({
    value,
    labelKey: `angles.choice.mode.${keyOf(value)}`,
    count: viewCountOf(value),
  })),
  default: "set",
}

export const app: AppInput = defineApp({
  id: "angles",
  nameKey: "angles.name",
  category: "image",
  inputs: [
    mode,
    {
      type: "image",
      name: "image",
      labelKey: "angles.input.image.label",
      presence: "required",
      max: 1,
    },
    choice("angleSet", angleSets, "turnaround", inMode("set")),
    choice("side", sides, "back", inMode("single")),
    choice("height", heights, "eye-level", inMode("single")),
    choice("distance", distances, "medium"),
    { type: "seed", name: "seed", labelKey: "field.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: viewsPerSet, max: viewsPerSet },
    aspectRatios: {
      options: ["1:1", "4:3", "3:4", "16:9", "9:16"],
      default: "1:1",
    },
  },
  engine: taskBinding({
    tasks: [],
    input: "model",
    default: graphModel,
    fallback: anglesBinding,
  }),
  limits: { timeoutSeconds: 900, maxRetries: 1 },
})
