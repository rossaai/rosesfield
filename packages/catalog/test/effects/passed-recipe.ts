import {
  deliveryFrames,
  type EffectRatio,
  framesOf,
} from "#effects/comfy/frame-sizes"
import type {
  EffectRecipe,
  EffectRun,
  ResolutionValue,
  VideoReading,
} from "#effects/effect-recipe.contract"
import { recipeOf } from "#effects/effect-recipes"

export const passedRun = {
  runId: "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
  seed: 7,
  resolution: "480p",
  aspectRatio: "9:16",
  workflowHash:
    "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
} as const

function loudnessFor(
  sound: EffectRecipe["design"]["sound"]
): VideoReading["loudness"] {
  if (sound === null) {
    return null
  }
  return {
    integrated: (sound.loudness.min + sound.loudness.max) / 2,
    truePeak: sound.truePeakMax - 1,
  }
}

export function readingFor(
  recipe: EffectRecipe,
  resolution: ResolutionValue,
  ratio: EffectRatio
): VideoReading {
  const size = deliveryFrames[resolution][ratio]
  const maxLuma = recipe.design.lastFrame.maxLuma
  const cuts = recipe.design.cuts.filter((window) => window.kind === "cut")
  return {
    frames: framesOf(recipe.seconds),
    fps: 24,
    width: size.width,
    height: size.height,
    cuts: cuts.map((window) => (window.min + window.max) / 2),
    loudness: loudnessFor(recipe.design.sound),
    firstFrameLuma: 96,
    lastFrameLuma: maxLuma === null ? 60 : maxLuma - 1,
  }
}

export function passedRecipe(effect: string): EffectRecipe {
  const recipe = recipeOf(effect)
  return {
    ...recipe,
    passed: true,
    preview: { file: `${effect}.mp4`, ...passedRun },
    proof: {
      gate: { positives: 1, planted: "refused", verdict: "held" },
      judge: { criteria: 14, failed: [], verdict: "held" },
      reading: readingFor(recipe, passedRun.resolution, passedRun.aspectRatio),
    },
  }
}

export function keptRun(effect: string): EffectRun {
  return {
    ...passedRun,
    effect,
    photo: "3f1c9a7e0b2d4c6e8f0a1b3c5d7e9f1a2b4c6d8e0f1a3b5c7d9e1f2a4b6c8d0e",
    balance: { before: 3662.6, after: 3601.4 },
    verdict: "kept",
    failed: [],
  }
}
