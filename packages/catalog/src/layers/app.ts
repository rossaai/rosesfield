import { type AppInput, defineApp } from "#define-app"
import {
  defaultLayerCount,
  type LayersMode,
  layerCountValues,
  layersBinding,
  modeGraphs,
  modeValues,
  oneLayerModes,
} from "#layers/comfy/layers-binding"
import { lightValues, toneValues } from "#layers/comfy/light-words"

type Input = AppInput["inputs"][number]

export const layersRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"]

const countWords = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
]

function inModes(...modes: LayersMode[]) {
  return [{ input: "mode", is: modes }]
}

const count: Input = {
  type: "choice",
  name: "count",
  labelKey: "layers.input.count.label",
  options: layerCountValues.map((value) => ({
    value,
    labelKey: `layers.choice.count.${countWords[Number(value) - 1]}`,
    count: Number(value),
  })),
  default: defaultLayerCount,
  bounds: [
    {
      when: inModes("split"),
      values: layerCountValues.filter((value) => value !== "1"),
    },
    { when: inModes(...oneLayerModes), values: ["1"] },
  ],
}

const graphLabels: Readonly<Record<LayersMode, string>> = {
  split: "layers.model.qwenImageLayered",
  edit: "layers.model.qwenImageEdit2511",
  relight: "layers.model.qwenImageEdit2509Relight",
  fill: "layers.model.qwenImageInpaint",
}

const model: Input = {
  type: "choice",
  name: "model",
  labelKey: "image.input.model.label",
  options: modeValues.map((mode) => ({
    value: modeGraphs[mode],
    labelKey: graphLabels[mode],
  })),
  default: modeGraphs.split,
  bounds: modeValues.map((mode) => ({
    when: inModes(mode),
    values: [modeGraphs[mode]],
  })),
}

export const app: AppInput = defineApp({
  id: "layers",
  nameKey: "layers.name",
  category: "image",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "layers.input.mode.label",
      options: modeValues.map((value) => ({
        value,
        labelKey: `layers.choice.mode.${value}`,
      })),
      default: "split",
    },
    model,
    count,
    {
      type: "image",
      name: "source",
      labelKey: "layers.input.source.label",
      presence: "required",
      max: 1,
      when: inModes("split"),
    },
    {
      type: "image",
      name: "layer",
      labelKey: "layers.input.layer.label",
      presence: "required",
      max: 1,
      when: inModes(...oneLayerModes),
    },
    {
      type: "prompt",
      name: "change",
      labelKey: "layers.input.change.label",
      presence: "required",
      maxLength: 500,
      when: inModes("edit"),
    },
    {
      type: "choice",
      name: "light",
      labelKey: "layers.input.light.label",
      options: lightValues.map((value) => ({
        value,
        labelKey: `layers.choice.light.${value}`,
      })),
      default: "left",
      when: inModes("relight"),
    },
    {
      type: "choice",
      name: "tone",
      labelKey: "layers.input.tone.label",
      options: toneValues.map((value) => ({
        value,
        labelKey:
          value === "auto" ? "choice.auto" : `layers.choice.tone.${value}`,
      })),
      default: "auto",
      when: inModes("relight"),
    },
    {
      type: "image",
      name: "mask",
      labelKey: "layers.input.mask.label",
      presence: "required",
      max: 1,
      when: inModes("fill"),
    },
    {
      type: "prompt",
      name: "content",
      labelKey: "layers.input.content.label",
      presence: "optional",
      maxLength: 500,
      when: inModes("fill"),
    },
    {
      type: "choice",
      name: "quality",
      labelKey: "layers.input.quality.label",
      options: [
        { value: "draft", labelKey: "choice.quality.draft" },
        { value: "final", labelKey: "choice.quality.final" },
      ],
      default: "draft",
    },
    { type: "seed", name: "seed", labelKey: "layers.input.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: Number(defaultLayerCount), max: layerCountValues.length },
    aspectRatios: { options: [...layersRatios], default: "1:1" },
  },
  engine: layersBinding,
  limits: { timeoutSeconds: 1800, maxRetries: 1 },
  preview: null,
})
