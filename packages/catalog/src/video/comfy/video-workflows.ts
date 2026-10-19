import { apiGraph } from "#workflow-entry.contract"

export type VideoWorkflowName = "ltx-2-5-text" | "ltx-2-5-start-frame"

export const videoWorkflows: Readonly<Record<VideoWorkflowName, string>> = {
  "ltx-2-5-text": "video-ltx-2-5-text",
  "ltx-2-5-start-frame": "video-ltx-2-5-start-frame",
}

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
