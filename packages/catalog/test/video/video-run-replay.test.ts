import { ComfyGenerationEngine } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { videoGateway } from "./video-gateway"
import {
  asset,
  lastFrameId,
  prompt,
  recorded,
  replayFetch,
  startFrameId,
  type Workflow,
} from "./video-recordings"

async function submittedRun(inputs: Record<string, unknown>) {
  const files = Object.values(inputs).filter(Array.isArray).flat()
  const replay = replayFetch([
    ...files.map(() => recorded.upload),
    recorded.submit,
  ])
  const gateway = videoGateway(
    () =>
      new ComfyGenerationEngine({ apiKey: "comfyui-test", fetch: replay.fetch })
  )
  const { run } = await gateway.startVideo(inputs, 1, "video-run-0002")
  await gateway.step(run.id)
  const jobs = replay.sent.filter((one) => one.url.endsWith("/api/v2/jobs"))
  return {
    runId: run.id,
    jobs,
    workflows: jobs.map(
      (one): Workflow => JSON.parse(one.body ?? "{}").workflow
    ),
  }
}

describe("a Video run on the LTX 2.5 graph, replayed", () => {
  it("sends one workflow with the run's seed and key", async () => {
    const { runId, jobs, workflows } = await submittedRun({
      prompt,
      model: "ltx-2-5",
      seed: 1234,
    })
    expect(workflows.map((one) => one["339"]?.inputs.noise_seed)).toEqual([
      1234,
    ])
    expect(workflows.map((one) => one["356"]?.inputs.batch_size)).toEqual([1])
    expect(jobs.map((one) => one.idempotencyKey)).toEqual([runId])
  })

  it("uploads the start frame and holds the camera words in the graph", async () => {
    const { workflows } = await submittedRun({
      prompt,
      model: "ltx-2-5",
      startFrame: [startFrameId],
      cameraMove: "pull-out",
      seed: 9,
    })
    expect(workflows[0]?.["401"]?.inputs.image).toEqual(asset)
    expect(workflows[0]?.["900"]?.inputs.string_b).toBe(
      "\nThe camera moves slowly backward, away from the subject."
    )
    expect(workflows[0]?.["339"]?.inputs.noise_seed).toBe(9)
  })

  it("uploads a first and a last frame and guides the end of the clip with the last", async () => {
    const { workflows } = await submittedRun({
      prompt,
      model: "ltx-2-5",
      startFrame: [startFrameId],
      lastFrame: [lastFrameId],
      seed: 5,
    })
    expect(workflows).toHaveLength(1)
    expect(workflows[0]?.["401"]?.inputs.image).toEqual(asset)
    expect(workflows[0]?.["402"]?.inputs.image).toEqual(asset)
    expect(workflows[0]?.["460"]?.inputs.frame_idx).toBe(-1)
    expect(workflows[0]?.["463"]?.inputs.frame_idx).toBe(-1)
  })

  it("sends no last-frame node for a run from a start frame alone", async () => {
    const { workflows } = await submittedRun({
      prompt,
      model: "ltx-2-5",
      startFrame: [startFrameId],
    })
    expect(Object.keys(workflows[0] ?? {})).not.toContain("402")
    expect(Object.keys(workflows[0] ?? {})).not.toContain("460")
  })
})
