import { describe, expect, it } from "vitest"
import { effectGraph, grainNode } from "#effects/comfy/effect-graph"
import { effectBinding } from "#motion/examples/example-binding"
import {
  type LibraryExample,
  maxGrain,
  resolutionValues,
} from "#motion/examples/library-example.contract"
import {
  libraryExamples as everyRecipe,
  exampleOf,
  readExamples,
} from "#motion/examples/library-examples"
import { fileGraph, isLink, workflowOf } from "./effects-replay"

const libraryExamples = everyRecipe.filter((recipe) => recipe.guide === null)

const blackFloor = 17.5

const frame = { width: 48, height: 32 }

const frameCount = 9

function seededNormal(seed: number): () => number {
  let state = seed >>> 0
  const uniform = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), state | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return (((mixed ^ (mixed >>> 14)) >>> 0) + 1) / 4294967297
  }
  return () =>
    Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform())
}

function addNoise(
  batch: readonly Float64Array[],
  seed: number,
  strength: number
): Float64Array[] {
  const normal = seededNormal(seed)
  return batch.map((image) =>
    image.map((value) => Math.min(1, Math.max(0, value + strength * normal())))
  )
}

function blackBatch(): Float64Array[] {
  return Array.from(
    { length: frameCount },
    () => new Float64Array(frame.width * frame.height * 3)
  )
}

function bytesOf(image: Float64Array): Uint8Array {
  return Uint8Array.from(image, (value) => Math.round(value * 255))
}

function meanLuma(image: Uint8Array): number {
  let sum = 0
  for (let at = 0; at < image.length; at += 3) {
    sum +=
      0.299 * (image[at] ?? 0) +
      0.587 * (image[at + 1] ?? 0) +
      0.114 * (image[at + 2] ?? 0)
  }
  return sum / (image.length / 3)
}

function repeats(frames: readonly Uint8Array[]): number {
  return frames.slice(1).filter((bytes, at) => {
    const before = frames[at]
    return (
      before !== undefined &&
      bytes.every((value, index) => value === before[index])
    )
  }).length
}

function strengthOf(recipe: LibraryExample): number {
  const strength = workflowOf(effectGraph(fileGraph(), recipe))[grainNode]
    ?.inputs.strength
  if (typeof strength !== "number") {
    throw new Error(`${recipe.id} sets no grain strength`)
  }
  return strength
}

function grained(strength: number): Uint8Array[] {
  return addNoise(blackBatch(), 42, strength).map(bytesOf)
}

describe("the grain on a black frame, by ImageAddNoise's math in ComfyUI v0.41.0: clip(image + strength * randn, 0, 1)", () => {
  it("keeps a black frame of every look under the black floor, about 0.4 levels at strength 0.004", () => {
    for (const recipe of libraryExamples) {
      const strength = strengthOf(recipe)
      const lumas = grained(strength).map(meanLuma)
      const mean = lumas.reduce((sum, luma) => sum + luma, 0) / lumas.length
      expect({ effect: recipe.id, under: mean < blackFloor }).toEqual({
        effect: recipe.id,
        under: true,
      })
      expect(mean).toBeCloseTo((strength * 255) / Math.sqrt(2 * Math.PI), 1)
    }
    const eye = strengthOf(exampleOf("push-into-eye"))
    expect(eye).toBe(0.004)
    expect(Math.max(...grained(maxGrain).map(meanLuma))).toBeLessThan(
      blackFloor
    )
  })

  it("makes no two frames of the same black input equal once the grain is added, and every frame repeats without it", () => {
    const strength = strengthOf(exampleOf("push-into-eye"))
    expect(repeats(grained(strength))).toBe(0)
    expect(repeats(grained(0))).toBe(frameCount - 1)
  })
})

function withEncode(encode: Record<string, unknown>): Record<string, unknown> {
  const recipe = exampleOf("many-copies")
  return { ...recipe, design: { ...recipe.design, encode } }
}

describe("the grain node of every effects graph", () => {
  it("adds the recipe's grain to every delivered frame after the last resize and before the video is written, for every look and resolution", () => {
    for (const recipe of libraryExamples) {
      for (const resolution of resolutionValues) {
        const path = `${recipe.id} ${resolution}`
        const workflow = workflowOf(
          effectBinding(recipe, resolution).config.workflow
        )
        expect({ path, chain: workflow }).toMatchObject({
          path,
          chain: {
            "380": { class_type: "ImageScale", inputs: { image: ["374", 0] } },
            [grainNode]: {
              class_type: "ImageAddNoise",
              inputs: {
                image: ["380", 0],
                strength: recipe.design.encode.grain,
              },
            },
            "370": {
              class_type: "CreateVideo",
              inputs: { images: [grainNode, 0] },
            },
          },
        })
        const readers = Object.entries(workflow)
          .filter(([, node]) =>
            Object.values(node.inputs).some(
              (value) => isLink(value) && value[0] === "380"
            )
          )
          .map(([id]) => id)
        expect({ path, readers }).toEqual({ path, readers: [grainNode] })
      }
    }
  })

  it("sets the grain's strength from the recipe's encode", () => {
    const recipe = exampleOf("melt-away")
    const grained = {
      ...recipe,
      design: {
        ...recipe.design,
        encode: { ...recipe.design.encode, grain: 0.013 },
      },
    }
    expect(
      workflowOf(effectGraph(fileGraph(), grained))[grainNode]?.inputs.strength
    ).toBe(0.013)
    expect(
      workflowOf(effectGraph(fileGraph(), recipe))[grainNode]?.inputs.strength
    ).toBe(0.004)
  })

  it("reads the grain of a look's encode, 0.004 when it names none, and refuses one outside 0 to 0.02", () => {
    const { grain: _grain, ...authored } =
      exampleOf("many-copies").design.encode
    const read = (encode: Record<string, unknown>): number | undefined =>
      readExamples({ "many-copies": withEncode(encode) }, [])[0]?.design.encode
        .grain
    expect(read(authored)).toBe(0.004)
    for (const grain of [0, 0.01, 0.02]) {
      expect(read({ ...authored, grain })).toBe(grain)
    }
    for (const grain of [-0.001, 0.021, "0.004"]) {
      expect(() => read({ ...authored, grain })).toThrow(
        /many-copies\.json is invalid: design\.encode\.grain/
      )
    }
  })
})
