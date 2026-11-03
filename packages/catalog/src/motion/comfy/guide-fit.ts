import type { Graph } from "#video/comfy/video-workflows"

export type FrameSize = { width: number; height: number }

/** Node 200 loads your photo, which the guided render locks at frame 0 in both stages. */
export const photoNode = "200"

/** Node 713 reads the guide's frames: its width, its height and its frame count. */
const guideSizeNode = "713"

/** Node 702 holds the render's short side, which the run's resolution sets. */
const shortSideNode = "702"

export const fitWidthNode = "1040"

export const fitHeightNode = "1041"

export const fittedPhotoNode = "1042"

/** One side of the output frame in the guide's shape at the render's short side, in multiples of 128, so nodes 990 and 991 halve it evenly for stage 1. */
function sideExpression(side: "a" | "b"): string {
  return `round(${side} * c / min(a, b) / 128) * 128`
}

function sideNode(side: "a" | "b"): Graph[string] {
  return {
    class_type: "ComfyMathExpression",
    inputs: {
      "values.a": [guideSizeNode, 0],
      "values.b": [guideSizeNode, 1],
      "values.c": [shortSideNode, 0],
      expression: sideExpression(side),
    },
  }
}

function isPhotoLink(value: unknown): boolean {
  return Array.isArray(value) && value[0] === photoNode && value[1] === 0
}

/** Fits your photo to the guide's frame before it becomes frame 0: scaled to cover the guide's shape at the render's size and cut at its centre. The render then takes the guide's shape, so a photo of any shape starts the guide's video and the guide is never cut. */
export function withPhotoFitToGuide(graph: Graph): Graph {
  graph[fitWidthNode] = sideNode("a")
  graph[fitHeightNode] = sideNode("b")
  for (const node of Object.values(graph)) {
    for (const [name, value] of Object.entries(node.inputs)) {
      if (isPhotoLink(value)) {
        node.inputs[name] = [fittedPhotoNode, 0]
      }
    }
  }
  graph[fittedPhotoNode] = {
    class_type: "ImageScale",
    inputs: {
      image: [photoNode, 0],
      upscale_method: "lanczos",
      width: [fitWidthNode, 1],
      height: [fitHeightNode, 1],
      crop: "center",
    },
  }
  return graph
}
