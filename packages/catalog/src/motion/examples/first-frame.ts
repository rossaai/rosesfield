import type { RunInputs } from "@rosesfield/contract"
import { exampleInput, ownVideo } from "#motion/examples/example-binding"
import type { LibraryExample } from "#motion/examples/library-example.contract"
import { libraryExamples } from "#motion/examples/library-examples"

export type FirstFrame =
  | { from: "shape"; aspectRatio: string }
  | { from: "asset"; assetId: string }

const photoInput = "photo"

export function firstFrameOf(
  inputs: RunInputs,
  examples: readonly LibraryExample[] = libraryExamples
): FirstFrame | null {
  const chosen = inputs[exampleInput]
  if (typeof chosen === "string" && chosen !== ownVideo) {
    const shape = examples.find((example) => example.id === chosen)?.preview
    return shape === undefined || shape === null
      ? null
      : { from: "shape", aspectRatio: shape.aspectRatio }
  }
  const [photo] = Array.isArray(inputs[photoInput]) ? inputs[photoInput] : []
  return typeof photo === "string" ? { from: "asset", assetId: photo } : null
}
