import {
  defaultKind,
  defaultModel,
  defaultStyle,
  headlineLimit,
  keyOf,
  kindValues,
  lineLimit,
  modelValues,
  sceneLimit,
  styleValues,
} from "#ads/ads-values"
import { adsBinding } from "#ads/comfy/ads-binding"
import { adsRatios } from "#ads/comfy/ads-sizes"
import { defineApp } from "#define-app"

const productShot = [{ input: "kind", is: ["product-shot"] }]
const ad = [{ input: "kind", is: ["ad"] }]
const qwenOnly = ["qwen-image-edit-2511"]

export const app = defineApp({
  id: "ads",
  nameKey: "ads.name",
  category: "image",
  inputs: [
    {
      type: "choice",
      name: "kind",
      labelKey: "ads.input.kind.label",
      options: kindValues.map((value) => ({
        value,
        labelKey: `ads.choice.kind.${keyOf(value)}`,
      })),
      default: defaultKind,
    },
    {
      type: "prompt",
      name: "scene",
      labelKey: "ads.input.scene.label",
      presence: "optional",
      maxLength: sceneLimit,
      when: productShot,
    },
    {
      type: "prompt",
      name: "headline",
      labelKey: "ads.input.headline.label",
      presence: "required",
      maxLength: headlineLimit,
      when: ad,
    },
    {
      type: "prompt",
      name: "line",
      labelKey: "ads.input.line.label",
      presence: "optional",
      maxLength: lineLimit,
      when: ad,
    },
    {
      type: "image",
      name: "product",
      labelKey: "ads.input.product.label",
      presence: "required",
      max: 1,
    },
    {
      type: "image",
      name: "secondPhoto",
      labelKey: "ads.input.secondPhoto.label",
      presence: "optional",
      max: 1,
    },
    {
      type: "image",
      name: "thirdPhoto",
      labelKey: "ads.input.thirdPhoto.label",
      presence: "optional",
      max: 1,
      when: [{ input: "secondPhoto", state: "filled" }],
    },
    {
      type: "character",
      name: "character",
      labelKey: "ads.input.character.label",
      presence: "optional",
      max: 1,
      when: [{ input: "thirdPhoto", state: "empty" }],
    },
    {
      type: "choice",
      name: "style",
      labelKey: "ads.input.style.label",
      options: styleValues.map((value) => ({
        value,
        labelKey: `ads.choice.style.${keyOf(value)}`,
      })),
      default: defaultStyle,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "ads.input.model.label",
      options: modelValues.map((value) => ({
        value,
        labelKey: `ads.model.${keyOf(value)}`,
      })),
      default: defaultModel,
      bounds: [
        {
          when: [{ input: "thirdPhoto", state: "filled" }],
          values: qwenOnly,
        },
        {
          when: [
            { input: "secondPhoto", state: "filled" },
            { input: "character", state: "filled" },
          ],
          values: qwenOnly,
        },
      ],
    },
    { type: "seed", name: "seed", labelKey: "ads.input.seed.label" },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 4 },
    aspectRatios: { options: [...adsRatios], default: "1:1" },
  },
  engine: adsBinding,
  limits: { timeoutSeconds: 600, maxRetries: 1 },
  preview: null,
})
