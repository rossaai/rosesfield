import { describe, expect, it } from "vitest"
import { findWorkflow } from "#list-workflows"
import {
  extendGraph,
  extendNodes,
  extendWorkflow,
} from "#video-edit/comfy/extend-graph"
import { graphProblemsOf, type Workflow } from "./video-edit-cases"

function graphOf(): Workflow {
  const workflow = findWorkflow(extendWorkflow)
  if (workflow === null) {
    throw new Error(`no workflow ${extendWorkflow}`)
  }
  const graph: Workflow = JSON.parse(
    JSON.stringify(extendGraph(workflow.graph))
  )
  return graph
}

function inputsOf(graph: Workflow, id: string): Record<string, unknown> {
  return graph[id]?.inputs ?? {}
}

function startProblems(graph: Workflow): string[] {
  const problems: string[] = []
  const n = extendNodes
  const start = inputsOf(graph, "351").input
  if (JSON.stringify(start) !== JSON.stringify([n.startFrame, 0])) {
    problems.push(`LTX starts from ${JSON.stringify(start)}`)
  }
  const resized = inputsOf(graph, n.startFrame)
  if (JSON.stringify(resized.input) !== JSON.stringify([n.lastFrame, 0])) {
    problems.push("the start frame is not the frame the graph takes")
  }
  const last = inputsOf(graph, n.lastFrame)
  if (
    JSON.stringify(last) !==
    JSON.stringify({ image: [n.parts, 0], batch_index: -1, length: 1 })
  ) {
    problems.push(`the frame taken is ${JSON.stringify(last)}`)
  }
  return problems
}

function joinProblems(graph: Workflow): string[] {
  const problems: string[] = []
  const n = extendNodes
  const joined = inputsOf(graph, n.joined)
  if (
    JSON.stringify(joined) !==
    JSON.stringify({
      "images.image0": [n.parts, 0],
      "images.image1": [n.added, 0],
    })
  ) {
    problems.push(`the join is ${JSON.stringify(joined)}`)
  }
  const added = inputsOf(graph, n.added)
  if (added.batch_index !== 1 || JSON.stringify(added.image) !== '["374",0]') {
    problems.push(`the added frames are ${JSON.stringify(added)}`)
  }
  const video = inputsOf(graph, "370")
  if (
    JSON.stringify([video.images, video.fps, video.audio]) !==
    JSON.stringify([
      [n.joined, 0],
      [n.parts, 2],
      [n.sound, 0],
    ])
  ) {
    problems.push(`the clip written is ${JSON.stringify(video)}`)
  }
  return problems
}

describe("Extend on Video's LTX 2.5 start frame graph", () => {
  it("starts LTX 2.5 from the last frame of your clip, at your clip's size ratio", () => {
    const graph = graphOf()
    expect(startProblems(graph)).toEqual([])
    expect(inputsOf(graph, "356")).toMatchObject({
      width: [extendNodes.width, 1],
      height: [extendNodes.height, 1],
      length: [extendNodes.frames, 1],
    })
    expect(inputsOf(graph, extendNodes.startFrame)).toMatchObject({
      "resize_type.width": [extendNodes.fullWidth, 1],
      "resize_type.height": [extendNodes.fullHeight, 1],
      "resize_type.crop": "disabled",
    })
  })

  it("plays your clip first, then the added frames without the repeated start frame, at your clip's frame rate", () => {
    const graph = graphOf()
    expect(joinProblems(graph)).toEqual([])
    expect(inputsOf(graph, "365").frame_rate).toEqual([extendNodes.parts, 2])
    expect(inputsOf(graph, "366")).toMatchObject({
      frames_number: [extendNodes.frames, 1],
      frame_rate: [extendNodes.parts, 2],
    })
  })

  it("keeps no image loader, no last-frame guide and no link to a missing node", () => {
    const graph = graphOf()
    const classes = Object.values(graph).map((node) => node.class_type)
    expect(classes).not.toContain("LoadImage")
    expect(classes).not.toContain("LTXVAddGuide")
    expect(classes).not.toContain("LTXVAudioVAEDecode")
    expect(graphProblemsOf(graph)).toEqual([])
  })

  it("control: a graph that starts from the clip's first frame, or joins the repeated frame, is named", () => {
    const graph = graphOf()
    const first = structuredClone(graph)
    const lastFrame = first[extendNodes.lastFrame]
    if (lastFrame !== undefined) {
      lastFrame.inputs.batch_index = 0
    }
    expect(startProblems(first)).toHaveLength(1)
    const repeated = structuredClone(graph)
    const added = repeated[extendNodes.added]
    if (added !== undefined) {
      added.inputs.batch_index = 0
    }
    expect(joinProblems(repeated)).toHaveLength(1)
    const order = structuredClone(graph)
    const joined = order[extendNodes.joined]
    if (joined !== undefined) {
      joined.inputs = {
        "images.image0": [extendNodes.added, 0],
        "images.image1": [extendNodes.parts, 0],
      }
    }
    expect(joinProblems(order)).toHaveLength(1)
  })
})
