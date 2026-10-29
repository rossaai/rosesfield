import { ComfyGenerationEngine, comfyWorkflow } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { listWorkflows } from "#list-workflows"
import { recorded, replayFetch, type Workflow } from "../video/video-recordings"
import { stillSavesOf, withoutVideoStills } from "./video-stills"

async function sentGraphOf(graph: Record<string, unknown>): Promise<Workflow> {
  const replay = replayFetch([recorded.submit])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  await engine.submit({
    idempotencyKey: "stills-run-0001",
    binding: comfyWorkflow({ workflow: graph, bindings: [] }),
    inputs: {},
    files: [],
    count: 1,
    aspectRatio: null,
    seed: null,
    outputKind: "video",
  })
  const job = replay.sent.find((one) => one.url.endsWith("/api/v2/jobs"))
  return JSON.parse(job?.body ?? "{}").workflow
}

function framesOf(graph: Workflow): unknown[] {
  return Object.values(graph).flatMap((node) => {
    const video = node.inputs.video
    const made = Array.isArray(video) ? graph[String(video[0])] : undefined
    return node.class_type === "SaveVideo" && made?.class_type === "CreateVideo"
      ? [made.inputs.images]
      : []
  })
}

function brokenLinksOf(graph: Workflow): string[] {
  return Object.entries(graph).flatMap(([id, node]) =>
    Object.entries(node.inputs).flatMap(([name, value]) =>
      Array.isArray(value) &&
      typeof value[0] === "string" &&
      graph[value[0]] === undefined
        ? [`${id}.${name}`]
        : []
    )
  )
}

const workflows = listWorkflows()
const videoWorkflows = workflows.filter((workflow) =>
  JSON.stringify(workflow.graph).includes('"SaveVideo"')
)

describe("the stills every video workflow sends", () => {
  it("covers every workflow that saves a video", () => {
    expect(videoWorkflows.map((one) => one.id).sort()).toEqual([
      "effects-ltx-2-5",
      "lipsync-photo-ltx-2-3",
      "motion-guide-ltx-2-3-ic-lora",
      "motion-guide-ltx-2-5",
      "motion-ltx-2-3-ic-lora",
      "motion-read-clip",
      "upscale-video-seedvr2",
      "video-edit-background-birefnet",
      "video-edit-frame-rate-film",
      "video-edit-reframe-ltx-2-3",
      "video-ltx-2-5-start-frame",
      "video-ltx-2-5-text",
    ])
  })

  it.each(videoWorkflows.map((one) => ({ id: one.id, graph: one.graph })))(
    "samples five frames of the batch $id makes its video from",
    async ({ graph }) => {
      const sent = await sentGraphOf(graph)
      const videos = framesOf(sent)
      expect(videos.length).toBeGreaterThan(0)
      const saves = stillSavesOf(sent)
      expect(saves).toHaveLength(5 * videos.length)
      const picks = Object.values(sent).filter(
        (node) =>
          node.class_type === "ImageFromBatch" &&
          !JSON.stringify(graph).includes(JSON.stringify(node))
      )
      expect(picks.map((node) => node.inputs.image)).toEqual(
        videos.flatMap((frames) => Array(5).fill(frames))
      )
      expect(brokenLinksOf(sent)).toEqual([])
      expect(withoutVideoStills(sent)).toEqual(graph)
    }
  )

  it("sends a graph that saves no video as it is", async () => {
    const image = workflows.find((one) => one.id === "image-z-image-turbo")
    const graph = image?.graph ?? {}
    const sent = await sentGraphOf(graph)
    expect(Object.keys(graph)).not.toHaveLength(0)
    expect(stillSavesOf(sent)).toEqual([])
    expect(sent).toEqual(graph)
  })
})
