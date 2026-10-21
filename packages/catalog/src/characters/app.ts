import {
  angleSets,
  views,
  viewsOf,
  viewsPerRun,
} from "#characters/angle-sets"
import {
  anglesModel,
  charactersEngine,
  portraitDefault,
} from "#characters/comfy/characters-engine"
import { portraitModels } from "#characters/comfy/traits-binding"
import {
  camelOf,
  defaultPortraitCount,
  framingValues,
  type Mode,
  modes,
  portraitCounts,
  traitNames,
  traitValues,
} from "#characters/traits"
import { type AppInput, defineApp } from "#define-app"
import { modelLabels } from "#edit/edit-models"

type Input = AppInput["inputs"][number]

type ChoiceInput = Extract<Input, { type: "choice" }>

const countWords: Record<string, string> = {
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
}

function labelOf(name: string): string {
  return `characters.input.${name}.label`
}

function optionLabel(list: string, value: string): string {
  if (value === "auto") {
    return "choice.auto"
  }
  const key = list === "count" ? countWords[value] : camelOf(value)
  return `characters.choice.${list}.${key ?? value}`
}

function inMode(mode: Mode) {
  return [{ input: "mode", is: [mode] }]
}

function choice(
  name: string,
  values: readonly string[],
  fallback: string,
  mode: Mode
): ChoiceInput {
  return {
    type: "choice",
    name,
    labelKey: labelOf(name),
    options: values.map((value) => ({
      value,
      labelKey: optionLabel(name, value),
    })),
    default: fallback,
    when: inMode(mode),
  }
}

const count: Input = {
  type: "choice",
  name: "count",
  labelKey: labelOf("count"),
  options: portraitCounts.map((value) => ({
    value,
    labelKey: optionLabel("count", value),
    count: Number(value),
  })),
  default: defaultPortraitCount,
  bounds: [{ when: inMode("angles"), values: [String(viewsPerRun)] }],
}

const view: Input = {
  type: "choice",
  name: "view",
  scope: "app",
  labelKey: "app.canvas.view",
  options: views.map((value) => ({
    value,
    labelKey: `characters.view.${value}`,
  })),
  default: "front",
  when: inMode("angles"),
  bounds: angleSets.map((angleSet) => ({
    when: [{ input: "angleSet", is: [angleSet] }],
    values: [...viewsOf(angleSet)],
  })),
}

const model: Input = {
  type: "choice",
  name: "model",
  labelKey: labelOf("model"),
  options: [
    ...portraitModels.map((one) => ({
      value: one.value,
      labelKey: one.labelKey,
    })),
    { value: anglesModel, labelKey: modelLabels[anglesModel] },
  ],
  default: portraitDefault,
  bounds: [
    {
      when: inMode("traits"),
      values: portraitModels.map((one) => one.value),
    },
    { when: inMode("angles"), values: [anglesModel] },
  ],
}

export const app = defineApp({
  id: "characters",
  nameKey: "characters.name",
  category: "character",
  inputs: [
    {
      type: "choice",
      name: "mode",
      scope: "app",
      labelKey: labelOf("mode"),
      options: modes.map((value) => ({
        value,
        labelKey: optionLabel("mode", value),
      })),
      default: "traits",
    },
    count,
    ...traitNames.map((name) =>
      choice(name, traitValues[name], "auto", "traits")
    ),
    {
      type: "prompt",
      name: "details",
      labelKey: labelOf("details"),
      presence: "optional",
      maxLength: 300,
      when: inMode("traits"),
    },
    choice("framing", framingValues, "half-body", "traits"),
    {
      type: "toggle",
      name: "plainBackground",
      labelKey: labelOf("plainBackground"),
      default: "on",
      when: inMode("traits"),
    },
    model,
    {
      type: "character",
      name: "character",
      scope: "app",
      labelKey: labelOf("character"),
      presence: "required",
      max: 1,
      when: inMode("angles"),
    },
    { ...choice("angleSet", angleSets, "turnaround", "angles"), scope: "app" },
    view,
    { type: "seed", name: "seed", labelKey: "field.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: Number(defaultPortraitCount), max: viewsPerRun },
    aspectRatios: { options: ["3:4", "1:1", "9:16"], default: "3:4" },
  },
  engine: charactersEngine(),
  limits: { timeoutSeconds: 600, maxRetries: 2 },
})
