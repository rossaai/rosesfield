import { AppDefinitionInvalidError } from "#app-definition-invalid.error"

export type Link = [string, number]

type Node = { class_type: string; inputs: Record<string, unknown> }

export type Graph = Record<string, Node>

export const effectsWorkflow = "effects-ltx-2-5"

export function invalid(reason: string): AppDefinitionInvalidError {
  return new AppDefinitionInvalidError({ folder: "effects", reason })
}

export function nodeOf(graph: Graph, id: string): Node {
  const node = graph[id]
  if (node === undefined) {
    throw invalid(`the workflow ${effectsWorkflow} has no node ${id}`)
  }
  return node
}

export function isLink(value: unknown): value is Link {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

export function relink(graph: Graph, from: Link, to: Link): void {
  for (const node of Object.values(graph)) {
    for (const [name, value] of Object.entries(node.inputs)) {
      if (isLink(value) && value[0] === from[0] && value[1] === from[1]) {
        node.inputs[name] = [...to]
      }
    }
  }
}

export function remove(graph: Graph, ids: readonly string[]): void {
  for (const id of ids) {
    nodeOf(graph, id)
    delete graph[id]
  }
}
