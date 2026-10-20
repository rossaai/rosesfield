import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

export type VideoWorkflowName = "ltx-2-5-text" | "ltx-2-5-start-frame"

type Graph = Record<
  string,
  { class_type: string; inputs: Record<string, unknown> }
>

type Link = [string, number]

export const videoWorkflows: Readonly<Record<VideoWorkflowName, string>> = {
  "ltx-2-5-text": "video-ltx-2-5-text",
  "ltx-2-5-start-frame": "video-ltx-2-5-start-frame",
}

export const lastFrameImageNodes: readonly string[] = ["402", "403", "404"]

export const lastFrameGuideNodes: readonly string[] = [
  "460",
  "462",
  "463",
  "465",
]

const guideOutputs: readonly string[] = ["positive", "negative", "latent"]

export function withoutSound(
  workflow: Record<string, unknown>,
  videoNode: string
): Record<string, unknown> {
  const graph = apiGraph.parse(workflow)
  const node = graph[videoNode]
  if (node === undefined) {
    return graph
  }
  const inputs = Object.fromEntries(
    Object.entries(node.inputs).filter(([name]) => name !== "audio")
  )
  return { ...graph, [videoNode]: { ...node, inputs } }
}

function isLink(value: unknown): value is Link {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function invalid(reason: string): WorkflowInvalidError {
  return new WorkflowInvalidError({
    folder: videoWorkflows["ltx-2-5-start-frame"],
    reason,
  })
}

function relink(graph: Graph, from: Link, to: Link): void {
  for (const node of Object.values(graph)) {
    for (const [name, value] of Object.entries(node.inputs)) {
      if (isLink(value) && value[0] === from[0] && value[1] === from[1]) {
        node.inputs[name] = [...to]
      }
    }
  }
}

function passThrough(graph: Graph, id: string): void {
  const node = graph[id]
  if (node === undefined) {
    throw invalid(`it has no node ${id}`)
  }
  delete graph[id]
  guideOutputs.forEach((name, slot) => {
    const source = node.inputs[name]
    if (!isLink(source)) {
      throw invalid(`node ${id} passes no link through ${name}`)
    }
    relink(graph, [id, slot], source)
  })
}

export function withoutLastFrame(
  workflow: Record<string, unknown>
): Record<string, unknown> {
  const graph: Graph = structuredClone(apiGraph.parse(workflow))
  for (const id of lastFrameGuideNodes) {
    passThrough(graph, id)
  }
  for (const id of lastFrameImageNodes) {
    if (graph[id] === undefined) {
      throw invalid(`it has no node ${id}`)
    }
    delete graph[id]
  }
  return graph
}
