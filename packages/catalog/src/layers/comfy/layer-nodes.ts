import type { WorkflowValueBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"

export type ApiNode = {
  class_type: string
  inputs: Record<string, unknown>
}

export type ApiWorkflow = Record<string, ApiNode>

type Link = [string, number]

export const midGrey = 0x808080

export const halfStep = 0.5 / 255

export const oneLayerBindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: "layer", index: 0, to: "layer" },
  { from: "count", map: { "1": 1 }, to: "count" },
]

export function graphOf(workflow: Record<string, unknown>): ApiWorkflow {
  return apiGraph.parse(workflow)
}

export function inputsOf(
  graph: ApiWorkflow,
  id: string
): Record<string, unknown> {
  const node = graph[id]
  if (node === undefined) {
    throw new Error(`The layers workflow has no node ${id}`)
  }
  return node.inputs
}

export function addNode(graph: ApiWorkflow, node: ApiNode): string {
  const ids = Object.keys(graph).map(Number).filter(Number.isInteger)
  const id = String(Math.max(0, ...ids) + 1)
  graph[id] = node
  return id
}

function sizeOf(size: string): { width: Link; height: Link } {
  return { width: [size, 0], height: [size, 1] }
}

export function layOnGrey(
  graph: ApiWorkflow,
  layer: string,
  size: string
): string {
  const grey = addNode(graph, {
    class_type: "EmptyImage",
    inputs: { ...sizeOf(size), batch_size: 1, color: midGrey },
  })
  const alpha = addNode(graph, {
    class_type: "InvertMask",
    inputs: { mask: [layer, 1] },
  })
  return addNode(graph, {
    class_type: "ImageCompositeMasked",
    inputs: {
      destination: [grey, 0],
      source: [layer, 0],
      x: 0,
      y: 0,
      resize_source: false,
      mask: [alpha, 0],
    },
  })
}

export function keepEveryAlphaStep(
  graph: ApiWorkflow,
  join: string,
  size: string
): void {
  const inputs = inputsOf(graph, join)
  const step = addNode(graph, {
    class_type: "SolidMask",
    inputs: { value: halfStep, ...sizeOf(size) },
  })
  const lowered = addNode(graph, {
    class_type: "MaskComposite",
    inputs: {
      destination: inputs.alpha,
      source: [step, 0],
      x: 0,
      y: 0,
      operation: "subtract",
    },
  })
  inputs.alpha = [lowered, 0]
}
