import type { WorkflowValueBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"

export type ApiNode = {
  class_type: string
  inputs: Record<string, unknown>
}

export type ApiWorkflow = Record<string, ApiNode>

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
