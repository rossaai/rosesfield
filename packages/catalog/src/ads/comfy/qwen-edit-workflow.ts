import { type ApiGraph, nodeInputs } from "#ads/comfy/ads-prompts"

export const qwenWorkflow = "ads-qwen-image-edit-2511"

const slots = [
  { node: "41", input: "image1" },
  { node: "83", input: "image2" },
  { node: "191", input: "image3" },
] as const

const encoderNodes = ["149", "151"] as const

export function qwenSlots(graph: ApiGraph, used: number): ApiGraph {
  for (const slot of slots.slice(used)) {
    delete graph[slot.node]
    for (const encoder of encoderNodes) {
      delete nodeInputs(graph, qwenWorkflow, encoder)[slot.input]
    }
  }
  return graph
}

export const qwenSizeTargets = [["width", "height"]] as const
