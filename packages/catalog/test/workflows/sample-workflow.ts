import type { WorkflowFiles } from "#workflow-entry.contract"

export function sampleGraph(): Record<string, unknown> {
  return {
    "3": {
      class_type: "KSampler",
      inputs: { seed: 0, steps: 4, model: ["4", 0], positive: ["6", 0] },
      _meta: { title: "KSampler" },
    },
    "4": {
      class_type: "UNETLoader",
      inputs: { unet_name: "model.safetensors" },
    },
    "6": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["4", 1] } },
    "10": { class_type: "LoadImage", inputs: { image: "" } },
    "9": { class_type: "SaveImage", inputs: { images: ["3", 0] } },
  }
}

export function sampleEntry(): Record<string, unknown> {
  return {
    name: "sample-image",
    title: "A sample image workflow",
    mediaType: "image",
    openSource: true,
    models: ["model.safetensors"],
    inputBindings: {
      prompt: { nodeId: "6", inputName: "text", type: "scalar" },
      seed: { nodeId: "3", inputName: "seed", type: "scalar" },
      reference: { nodeId: "10", inputName: "image", type: "cloud-asset" },
    },
    outputs: [{ nodeId: "9", key: "images", kind: "image" }],
  }
}

export function sampleFiles(
  entry: Record<string, unknown> = sampleEntry(),
  graph: Record<string, unknown> = sampleGraph()
): WorkflowFiles {
  return { folder: "sample-image", entry, graph }
}
