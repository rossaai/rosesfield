import { describe, expect, it } from "vitest"
import { findWorkflow } from "#list-workflows"
import {
  lastFrameGuideNodes,
  lastFrameImageNodes,
  type VideoWorkflowName,
  videoWorkflows,
  withoutLastFrame,
} from "#video/comfy/video-workflows"
import { apiGraph } from "#workflow-entry.contract"
import startFrameUi from "../../../../workflows/video-ltx-2-5-start-frame/video-ltx-2-5-start-frame.json"
import textUi from "../../../../workflows/video-ltx-2-5-text/video-ltx-2-5-text.json"

type Graph = ReturnType<typeof apiGraph.parse>

function startFrameGraph(): Graph {
  const workflow = findWorkflow(videoWorkflows["ltx-2-5-start-frame"])
  if (workflow === null) {
    throw new Error("The start-frame workflow is not listed")
  }
  return apiGraph.parse(structuredClone(workflow.graph))
}

const bf16Video = "ltx-2.5-22b-distilled-transformer-bf16.safetensors"

const bf16Text = "gemma4-12b-with-proj-ltx-2.5-bf16.safetensors"

const uiFiles: Readonly<Record<VideoWorkflowName, readonly { id: number }[]>> =
  {
    "ltx-2-5-text": textUi.nodes,
    "ltx-2-5-start-frame": startFrameUi.nodes,
  }

function uiNodeOf(name: VideoWorkflowName, id: number): unknown {
  const node = uiFiles[name].find((one) => one.id === id)
  if (node === undefined) {
    throw new Error(`the UI file of ${name} has no node ${id}`)
  }
  return node
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

describe("the Video graphs' LTX 2.5 files", () => {
  for (const name of Object.keys(videoWorkflows) as VideoWorkflowName[]) {
    it(`${name} loads the bf16 transformer and text encoder in the API file, the UI file and the entry`, () => {
      const workflow = findWorkflow(videoWorkflows[name])
      if (workflow === null) {
        throw new Error(`${name} is not listed`)
      }
      expect(workflow.graph).toMatchObject({
        "384": { class_type: "UNETLoader", inputs: { unet_name: bf16Video } },
        "387": { class_type: "CLIPLoader", inputs: { clip_name: bf16Text } },
      })
      for (const [id, file, folder] of [
        [384, bf16Video, "diffusion_models"],
        [387, bf16Text, "text_encoders"],
      ] as const) {
        expect(uiNodeOf(name, id)).toMatchObject({
          widgets_values: expect.arrayContaining([file]),
          properties: {
            models: [
              {
                name: file,
                url: `https://huggingface.co/Lightricks/LTX-2.5/resolve/main/${folder}/${file}`,
                directory: folder,
              },
            ],
          },
        })
      }
      expect(workflow.models).toEqual(
        expect.arrayContaining([bf16Video, bf16Text])
      )
      expect(JSON.stringify([workflow.graph, uiFiles[name]])).not.toContain(
        "int8"
      )
    })
  }
})
