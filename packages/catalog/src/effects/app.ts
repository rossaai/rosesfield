import type { AppInput } from "#define-app"
import { defineApp } from "#define-app"
import { effectsBinding } from "#effects/comfy/effects-binding"
import { effectRatios } from "#effects/comfy/frame-sizes"
import {
  type EffectRecipe,
  guideResolutionValues,
} from "#effects/effect-recipe.contract"
import { effectKeyOf, passedRecipes } from "#effects/effect-recipes"

export const photoAccept = {
  formats: ["image/png", "image/jpeg", "image/webp"],
  maxBytes: 20_000_000,
  minShortSide: 480,
} as const

export const runLimitSeconds = 600

type AppInputs = AppInput["inputs"]

type When = { when?: [{ input: string; is: string[] }] }

function whenEffectIs(ids: readonly string[], all: readonly string[]): When {
  return ids.length === all.length || ids.length === 0
    ? {}
    : { when: [{ input: "effect", is: [...ids] }] }
}

function effectInput(offered: readonly EffectRecipe[]): AppInputs {
  const [first] = offered
  return first === undefined
    ? []
    : [
        {
          type: "choice",
          name: "effect",
          labelKey: "effects.input.effect.label",
          options: offered.map((recipe) => ({
            value: recipe.effect,
            labelKey: `effects.choice.effect.${effectKeyOf(recipe.effect)}`,
          })),
          default: first.effect,
        },
      ]
}

function resolutionInput(offered: readonly EffectRecipe[]): AppInputs {
  const guided = offered
    .filter((recipe) => recipe.guide !== null)
    .map((recipe) => recipe.effect)
  return [
    {
      type: "choice",
      name: "resolution",
      labelKey: "effects.input.resolution.label",
      options: [
        { value: "480p", labelKey: "effects.choice.resolution.p480" },
        { value: "720p", labelKey: "effects.choice.resolution.p720" },
        { value: "1080p", labelKey: "effects.choice.resolution.p1080" },
      ],
      default: "720p",
      ...(guided.length === 0
        ? {}
        : {
            bounds: [
              {
                when: [{ input: "effect", is: guided }],
                values: [...guideResolutionValues],
              },
            ],
          }),
    },
  ]
}

export function effectsApp(offered: readonly EffectRecipe[]): AppInput {
  const all = offered.map((recipe) => recipe.effect)
  const unguided = offered
    .filter((recipe) => recipe.guide === null)
    .map((recipe) => recipe.effect)
  return defineApp({
    id: "effects",
    nameKey: "effects.name",
    category: "video",
    inputs: [
      ...effectInput(offered),
      {
        type: "image",
        name: "image",
        labelKey: "effects.input.image.label",
        presence: "required",
        max: 1,
        accept: {
          formats: [...photoAccept.formats],
          maxBytes: photoAccept.maxBytes,
          minShortSide: photoAccept.minShortSide,
        },
      },
      {
        type: "prompt",
        name: "prompt",
        labelKey: "effects.input.prompt.label",
        presence: "optional",
        maxLength: 300,
        ...whenEffectIs(unguided, all),
      },
      ...resolutionInput(offered),
      { type: "seed", name: "seed", labelKey: "effects.input.seed.label" },
    ],
    output: {
      kind: "video",
      count: { default: 1, max: 1 },
      aspectRatios: { options: [...effectRatios], default: "16:9" },
    },
    engine: effectsBinding(offered),
    limits: { timeoutSeconds: runLimitSeconds, maxRetries: 0 },
    preview: null,
    closedKey: offered.length === 0 ? "effects.closed" : null,
  })
}

export const app = effectsApp(passedRecipes)
