import { type ApiGraph, nodeInputs } from "#ads/comfy/ads-prompts"

export const kleinWorkflow = "ads-flux-2-klein-4b"

const secondSlotNodes = ["81", "124", "125", "126", "127"] as const

export function kleinSlots(graph: ApiGraph, used: number): ApiGraph {
  if (used >= 2) {
    return graph
  }
  for (const id of secondSlotNodes) {
    delete graph[id]
  }
  Object.assign(nodeInputs(graph, kleinWorkflow, "63"), {
    positive: ["122", 0],
    negative: ["123", 0],
  })
  return graph
}

export const kleinSizeTargets = [
  ["schedulerWidth", "schedulerHeight"],
  ["width", "height"],
] as const
