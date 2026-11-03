import { describe, expect, it } from "vitest"
import { heldFilesOf, isHeldOnCloud } from "#comfy/cloud-weights"
import { findWorkflow } from "#list-workflows"
import {
  fileGraph,
  type Graph,
  graphSchema,
  linksToMissingNodes,
} from "./motion-replay"

const guideWorkflowId = "motion-guide-ltx-2-3-ic-lora"

const poseNodes = ["707", "708", "709", "710", "711", "712"]

const identitySentence =
  "The same person from the opening frame keeps the same face, hair, clothes and skin in every shot."

function guideGraph(): Graph {
  const workflow = findWorkflow(guideWorkflowId)
  if (workflow === null) {
    throw new Error(`workflows/${guideWorkflowId} is not listed`)
  }
  return graphSchema.parse(structuredClone(workflow.graph))
}

function set(graph: Graph, id: string, name: string, value: unknown): void {
  const node = graph[id]
  if (node === undefined) {
    throw new Error(`The graph has no node ${id}`)
  }
  node.inputs[name] = value
}

function recipeGraph(): Graph {
  const graph = fileGraph()
  for (const id of poseNodes) {
    delete graph[id]
  }
  set(graph, "717", "image", ["706", 0])
  set(graph, "719", "image1", ["706", 0])
  set(graph, "900", "string_a", identitySentence)
  set(graph, "68", "filename_prefix", "video/rosesfield-motion-guide")
  delete graph["122"]?.inputs.audio
  return graph
}

describe("the depth guide graph", () => {
  it("is the Motion graph with the recipes' edits: no pose nodes, the guide's frames into nodes 717 and 719, a depth sentence and no sound", () => {
    expect(guideGraph()).toEqual(recipeGraph())
    expect(linksToMissingNodes(guideGraph())).toEqual([])
  })

  it("runs only node classes the Motion graph runs on Comfy Cloud, and loads no pose model", () => {
    const motionClasses = new Set(
      Object.values(fileGraph()).map((node) => node.class_type)
    )
    const classes = Object.values(guideGraph()).map((node) => node.class_type)
    expect(classes.filter((one) => !motionClasses.has(one))).toEqual([])
    expect(classes).not.toContain("SDPoseKeypointExtractor")
    expect(classes).not.toContain("RTDETR_detect")
    expect(findWorkflow(guideWorkflowId)?.models).toEqual([
      "ltx-2.3-22b-distilled-fp8.safetensors",
      "ltx-2.3-22b-ic-lora-union-control-ref0.5.safetensors",
      "gemma_3_12B_it_fp4_mixed.safetensors",
    ])
  })

  it("loads only files Comfy Cloud's object_info lists, its checkpoint and its IC-LoRA among them", () => {
    const held = heldFilesOf()
    const files = findWorkflow(guideWorkflowId)?.models ?? []
    expect(files).toHaveLength(3)
    expect(isHeldOnCloud(files, held)).toBe(true)
    expect(held.has("ltx-2.3-22b-distilled-fp8.safetensors")).toBe(true)
    expect(
      held.has("ltx-2.3-22b-ic-lora-union-control-ref0.5.safetensors")
    ).toBe(true)
    expect(
      isHeldOnCloud([...files, "ltx-2.3-22b-ic-lora-pose-v0.safetensors"], held)
    ).toBe(false)
  })
})
