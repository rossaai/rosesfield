import { appDefinition } from "@rosesfield/contract"
import { parseComfyWorkflow, resolveBinding } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { motionApp } from "#motion/app"
import {
  fitHeightNode,
  fittedPhotoNode,
  fitWidthNode,
  photoNode,
} from "#motion/comfy/guide-fit"
import { motionEngine } from "#motion/comfy/motion-binding"
import { exampleOf } from "#motion/examples/library-examples"
import { type Graph, graphSchema, linksToMissingNodes } from "./motion-replay"

const photo = assetIdFormat.parse("0d9c8b7a-6f5e-4d3c-9b2a-1f0e9d8c7b6a")

const shortSides: Readonly<Record<string, number>> = {
  "480p": 512,
  "720p": 768,
  "1080p": 1152,
}

function exampleGraph(example: string, resolution: string): Graph {
  return graphSchema.parse(
    parseComfyWorkflow(
      resolveBinding(
        appDefinition.parse(motionApp([exampleOf(example)])).engine,
        {
          example,
          model: "ltx-2-5-guide",
          photo: [photo],
          resolution,
        }
      )
    ).workflow
  )
}

function readersOf(graph: Graph, id: string): string[] {
  return Object.entries(graph).flatMap(([reader, node]) =>
    Object.values(node.inputs).some(
      (value) => Array.isArray(value) && value[0] === id && value[1] === 0
    )
      ? [reader]
      : []
  )
}

function evaluated(expression: string, a: number, b: number, c: number) {
  const evaluate = new Function(
    "a",
    "b",
    "c",
    "min",
    "round",
    `return ${expression}`
  )
  return Number(evaluate(a, b, c, Math.min, Math.round))
}

function fittedSize(
  graph: Graph,
  guide: { width: number; height: number },
  resolution: string
): { width: number; height: number } {
  const side = (id: string): number => {
    const expression = graph[id]?.inputs.expression
    return evaluated(
      typeof expression === "string" ? expression : "0",
      guide.width,
      guide.height,
      shortSides[resolution] ?? 0
    )
  }
  return { width: side(fitWidthNode), height: side(fitHeightNode) }
}

describe("your photo on a guided example", () => {
  it("is fitted to the guide's frame before it is frame 0: scaled and cut at its centre, read by both stages and by the render's size", () => {
    const graph = exampleGraph("grab-and-run", "480p")
    expect(graph[fittedPhotoNode]).toEqual({
      class_type: "ImageScale",
      inputs: {
        image: [photoNode, 0],
        upscale_method: "lanczos",
        width: [fitWidthNode, 1],
        height: [fitHeightNode, 1],
        crop: "center",
      },
    })
    expect(readersOf(graph, photoNode)).toEqual([fittedPhotoNode])
    expect(readersOf(graph, fittedPhotoNode).sort()).toEqual([
      "198",
      "721",
      "994",
    ])
    for (const id of [fitWidthNode, fitHeightNode]) {
      expect(graph[id]?.inputs).toMatchObject({
        "values.a": ["713", 0],
        "values.b": ["713", 1],
        "values.c": ["702", 0],
      })
    }
    expect(linksToMissingNodes(graph)).toEqual([])
  })

  it.each([
    { example: "grab-and-run", at: "480p", size: [512, 768] },
    { example: "grab-and-run", at: "720p", size: [768, 1152] },
    { example: "ticket-wipe", at: "480p", size: [640, 512] },
  ])(
    "renders $example at $at in its guide's shape, $size, whatever the shape of your photo",
    ({ example, at, size }) => {
      const guide = exampleOf(example).guide
      expect(guide).not.toBeNull()
      if (guide === null) {
        return
      }
      const [width, height] = size
      expect(fittedSize(exampleGraph(example, at), guide, at)).toEqual({
        width,
        height,
      })
    }
  )

  it("keeps the frame your own video's chain edits as it is, since it already has the video's shape, the control", () => {
    const graph = graphSchema.parse(
      parseComfyWorkflow(
        resolveBinding(motionEngine, {
          model: "ltx-2-5-guide",
          firstFrame: [photo],
          guide: [photo],
          plannedScene: "A street at night",
          resolution: "480p",
        })
      ).workflow
    )
    expect(graph[fittedPhotoNode]).toBeUndefined()
    expect(readersOf(graph, photoNode).sort()).toEqual(["198", "721", "994"])
  })
})
