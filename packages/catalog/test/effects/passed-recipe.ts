import {
  deliveryFrames,
  type EffectRatio,
  framesOf,
} from "#effects/comfy/frame-sizes"
import type {
  ExampleRun,
  LibraryExample,
  ResolutionValue,
  VideoReading,
} from "#motion/examples/library-example.contract"
import { exampleOf, libraryExamples } from "#motion/examples/library-examples"

export const passedRun = {
  runId: "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
  seed: 7,
  resolution: "480p",
  aspectRatio: "9:16",
  workflowHash:
    "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
} as const

function loudnessFor(
  sound: LibraryExample["design"]["sound"]
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
  recipe: LibraryExample,
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

export function passedRecipe(effect: string): LibraryExample {
  const recipe = exampleOf(effect)
  return {
    ...recipe,
    passed: true,
    preview: {
      file: `${effect}.mp4`,
      sha256:
        "9f2cc139be5593dd24f85253cf99cc14191afb31900ccf658e840a80a5977787",
      bytes: 600_000,
      width: 554,
      height: 984,
      ...passedRun,
      model: "ltx-2.5-22b-distilled-transformer-bf16.safetensors",
      credits: 8.18,
      seconds: 74,
      madeAt: "2026-10-21T21:02:43Z",
    },
    proof: {
      gate: { positives: 1, planted: "refused", verdict: "held" },
      judge: { criteria: 14, failed: [], verdict: "held" },
      reading: readingFor(recipe, passedRun.resolution, passedRun.aspectRatio),
    },
  }
}

export function keptRun(effect: string): ExampleRun {
  return {
    ...passedRun,
    example: effect,
    photo: "3f1c9a7e0b2d4c6e8f0a1b3c5d7e9f1a2b4c6d8e0f1a3b5c7d9e1f2a4b6c8d0e",
    balance: { before: 3662.6, after: 3601.4 },
    verdict: "kept",
    failed: [],
  }
}

export const graphLooks = libraryExamples.filter(
  (recipe) => recipe.guide === null
)
