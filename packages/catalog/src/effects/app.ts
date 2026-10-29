import type { AppInput } from "#define-app"
import { defineApp } from "#define-app"
import { effectsBinding } from "#effects/comfy/effects-binding"
import { effectRatios } from "#effects/comfy/frame-sizes"
import type { EffectPreset } from "#effects/effect-preset.contract"
import {
  clipPresetIds,
  photoPresetIds,
  shownPresets,
} from "#effects/effect-presets"
import type { EffectRecipe } from "#effects/effect-recipe.contract"
import { effectKeyOf, passedRecipes } from "#effects/effect-recipes"

export const photoAccept = {
  formats: ["image/png", "image/jpeg", "image/webp"],
  maxBytes: 20_000_000,
  minShortSide: 480,
} as const

export const runLimitSeconds = 600

export const presetResolutions = ["480p", "720p"] as const

type AppInputs = AppInput["inputs"]

type Offered = {
  recipes: readonly EffectRecipe[]
  presets: readonly EffectPreset[]
}

function effectIdsOf(offered: Offered): string[] {
  return [
    ...offered.recipes.map((recipe) => recipe.effect),
    ...offered.presets.map((preset) => preset.id),
  ]
}

function effectInput(offered: Offered): AppInputs {
  const [first] = effectIdsOf(offered)
  return first === undefined
    ? []
    : [
        {
          type: "choice",
          name: "effect",
          labelKey: "effects.input.effect.label",
          options: effectIdsOf(offered).map((effect) => ({
            value: effect,
            labelKey: `effects.choice.effect.${effectKeyOf(effect)}`,
          })),
          default: first,
        },
      ]
}

type When = { when?: [{ input: string; is: string[] }] }

function whenEffectIs(ids: readonly string[], all: readonly string[]): When {
  return ids.length === all.length || ids.length === 0
    ? {}
    : { when: [{ input: "effect", is: [...ids] }] }
}

function presetInputs(offered: Offered): AppInputs {
  const photos = photoPresetIds(offered.presets)
  const clips = clipPresetIds(offered.presets)
  const inputs: AppInputs = []
  if (photos.length > 0) {
    inputs.push({
      type: "video",
      name: "guide",
      labelKey: "effects.input.guide.label",
      presence: "optional",
      max: 1,
      when: [{ input: "effect", is: photos }],
    })
  }
  if (clips.length > 0) {
    inputs.push({
      type: "video",
      name: "clip",
      labelKey: "effects.input.clip.label",
      presence: "required",
      max: 1,
      when: [{ input: "effect", is: clips }],
    })
  }
  return inputs
}

function formInputs(offered: Offered): AppInputs {
  const all = effectIdsOf(offered)
  const recipeIds = offered.recipes.map((recipe) => recipe.effect)
  const photoTaking = [...recipeIds, ...photoPresetIds(offered.presets)]
  return [
    ...effectInput(offered),
    {
      type: "image",
      name: "image",
      labelKey: "effects.input.image.label",
      presence: "required",
      max: 1,
      ...whenEffectIs(photoTaking, all),
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
      ...whenEffectIs(recipeIds, all),
    },
    ...presetInputs(offered),
  ]
}

function resolutionInput(presets: readonly EffectPreset[]): AppInputs {
  const presetIds = presets.map((preset) => preset.id)
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
      ...(presetIds.length === 0
        ? {}
        : {
            bounds: [
              {
                when: [{ input: "effect", is: presetIds }],
                values: [...presetResolutions],
              },
            ],
          }),
    },
  ]
}

export function effectsApp(
  recipes: readonly EffectRecipe[],
  presets: readonly EffectPreset[] = []
): AppInput {
  const offered = { recipes, presets }
  return defineApp({
    id: "effects",
    nameKey: "effects.name",
    category: "video",
    inputs: [
      ...formInputs(offered),
      ...resolutionInput(presets),
      { type: "seed", name: "seed", labelKey: "effects.input.seed.label" },
    ],
    output: {
      kind: "video",
      count: { default: 1, max: 1 },
      aspectRatios: { options: [...effectRatios], default: "16:9" },
    },
    engine: effectsBinding(recipes, presets),
    limits: { timeoutSeconds: runLimitSeconds, maxRetries: 0 },
    preview: null,
    closedKey: effectIdsOf(offered).length === 0 ? "effects.closed" : null,
  })
}

export const app = effectsApp(passedRecipes, shownPresets)
