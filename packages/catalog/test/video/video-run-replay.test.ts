import { ComfyGenerationEngine } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { videoGateway } from "./video-gateway"
import {
  asset,
  prompt,
  recorded,
  replayFetch,
  startFrameId,
  type Workflow,
} from "./video-recordings"

async function submittedRun(inputs: Record<string, unknown>) {
  const withFile = Object.values(inputs).some(Array.isArray)
  const replay = replayFetch(
    withFile ? [recorded.upload, recorded.submit] : [recorded.submit]
  )
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
})
