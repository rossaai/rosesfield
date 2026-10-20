import { describe, expect, it } from "vitest"
import { findWorkflow } from "#list-workflows"
import {
  lastFrameGuideNodes,
  lastFrameImageNodes,
  videoWorkflows,
  withoutLastFrame,
} from "#video/comfy/video-workflows"
import { apiGraph } from "#workflow-entry.contract"

type Graph = ReturnType<typeof apiGraph.parse>

function startFrameGraph(): Graph {
  const workflow = findWorkflow(videoWorkflows["ltx-2-5-start-frame"])
  if (workflow === null) {
    throw new Error("The start-frame workflow is not listed")
  }
  return apiGraph.parse(structuredClone(workflow.graph))
}

function linksOf(graph: Graph): string[] {
  return Object.entries(graph).flatMap(([id, node]) =>
    Object.entries(node.inputs).flatMap(([name, value]) =>
      Array.isArray(value) && typeof value[0] === "string"
        ? [`${value[0]}:${String(value[1])} to ${id}.${name}`]
        : []
    )
  )
}

describe("the start-frame graph with no last frame", () => {
  it("drops the last-frame image and its guides and links each next node to what the guide read", () => {
    const graph = startFrameGraph()
    const patched = apiGraph.parse(withoutLastFrame(graph))
    const dropped = [...lastFrameImageNodes, ...lastFrameGuideNodes]
    const kept = Object.keys(graph).filter((id) => !dropped.includes(id))
    expect(Object.keys(patched).sort()).toEqual(kept.sort())
    const fromDropped = linksOf(patched).filter((link) =>
      dropped.some((id) => link.startsWith(`${id}:`))
    )
    expect(fromDropped).toEqual([])
    expect(linksOf(patched)).toEqual(
      expect.arrayContaining([
        "357:0 to 377.video_latent",
        "365:0 to 388.positive",
        "365:1 to 388.negative",
        "367:0 to 348.samples",
        "349:0 to 340.video_latent",
        "365:0 to 391.positive",
        "365:1 to 391.negative",
        "369:0 to 374.samples",
      ])
    )
    expect(graph["460"]?.class_type).toBe("LTXVAddGuide")
  })

  it("refuses a graph that lost a guide, the control", () => {
    const graph = startFrameGraph()
    delete graph["463"]
    expect(() => withoutLastFrame(graph)).toThrow(
      expect.objectContaining({ code: "WORKFLOW_INVALID" })
    )
  })
})
