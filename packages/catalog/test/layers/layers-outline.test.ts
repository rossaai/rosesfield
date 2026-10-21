import { describe, expect, it } from "vitest"
import {
  imageId,
  maskId,
  type Node,
  requestFor,
  submit,
} from "./layers-comfy"

type Workflow = Record<string, Node>

const f = Math.fround

const levels = Array.from({ length: 256 }, (_, level) => level)

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function linkOf(value: unknown): string {
  if (!Array.isArray(value) || typeof value[0] !== "string") {
    throw new Error(`${JSON.stringify(value)} is not a link`)
  }
  return value[0]
}

function maskAt(workflow: Workflow, link: unknown, level: number): number {
  const id = linkOf(link)
  const node = workflow[id]
  const inputs = node?.inputs ?? {}
  switch (node?.class_type) {
    case "LoadImage":
      return f(1 - f(f(level) / f(255)))
    case "LoadImageMask":
      return 0
    case "SolidMask":
      return f(Number(inputs.value))
    case "InvertMask":
      return f(1 - maskAt(workflow, inputs.mask, level))
    case "MaskComposite": {
      const below = maskAt(workflow, inputs.destination, level)
      const above = maskAt(workflow, inputs.source, level)
      return clamp(
        f(inputs.operation === "add" ? below + above : below - above)
      )
    }
    default:
      throw new Error(`node ${id} is no mask node the test reads`)
  }
}

function joinOf(workflow: Workflow): Node {
  const joins = Object.values(workflow).filter(
    (node) => node.class_type === "JoinImageWithAlpha"
  )
  expect(joins).toHaveLength(1)
  const [join] = joins
  if (join === undefined) {
    throw new Error("the workflow joins no alpha")
  }
  return join
}

function savedAlphaOf(workflow: Workflow, level: number): number {
  const alpha = f(1 - maskAt(workflow, joinOf(workflow).inputs.alpha, level))
  return Math.trunc(Math.min(255, Math.max(0, f(f(255) * alpha))))
}

function changedLevels(workflow: Workflow): number[] {
  return levels.filter((level) => savedAlphaOf(workflow, level) !== level)
}

function withoutHalfStep(workflow: Workflow): Workflow {
  const copy = structuredClone(workflow)
  const join = joinOf(copy)
  const lowered = copy[linkOf(join.inputs.alpha)]
  join.inputs.alpha = lowered?.inputs.destination
  return copy
}

const oneLayerBodies = [
  {
    mode: "edit",
    body: { inputs: { mode: "edit", layer: [imageId], change: "a red hat" } },
  },
  {
    mode: "relight",
    body: { inputs: { mode: "relight", layer: [imageId], light: "left" } },
  },
  {
    mode: "relight at Final",
    body: {
      inputs: { mode: "relight", layer: [imageId], quality: "final" },
    },
  },
  {
    mode: "fill",
    body: { inputs: { mode: "fill", layer: [imageId], mask: [maskId] } },
  },
] as const

describe("the alpha a one-layer run puts back", () => {
  it.each(oneLayerBodies)(
    "keeps each of the 256 alpha levels of the layer in $mode",
    async ({ body }) => {
      const { workflow } = await submit(requestFor(body))
      expect(changedLevels(workflow)).toEqual([])
    }
  )

  it.each(oneLayerBodies)(
    "control: the same $mode graph without the half step loses levels to the float rounding of the alpha path",
    async ({ body }) => {
      const { workflow } = await submit(requestFor(body))
      expect(changedLevels(withoutHalfStep(workflow)).length).toBeGreaterThan(
        0
      )
    }
  )
})
