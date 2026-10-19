import { ComfyGenerationEngine } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { videoGateway } from "./video-gateway"
import {
  asset,
  clipId,
  prompt,
  recorded,
  replayFetch,
  startFrameId,
  type Workflow,
} from "./video-recordings"

async function submittedRun(inputs: Record<string, unknown>, count: number) {
  const withFile = Object.values(inputs).some(Array.isArray)
  const recordings = Array.from({ length: count }, () =>
    withFile ? [recorded.upload, recorded.submit] : [recorded.submit]
  ).flat()
  const replay = replayFetch(recordings)
  const gateway = videoGateway(
    () =>
      new ComfyGenerationEngine({ apiKey: "comfyui-test", fetch: replay.fetch })
  )
  const { run } = await gateway.startVideo(inputs, count, "video-run-0002")
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

describe("a Video run on Comfy, replayed", () => {
  it("sends one workflow per output, each with its own seed and key", async () => {
    const { runId, jobs, workflows } = await submittedRun(
      { prompt, seed: 1234 },
      3
    )
    expect(workflows.map((one) => one["339"]?.inputs.noise_seed)).toEqual([
      1234, 1235, 1236,
    ])
    expect(workflows.map((one) => one["356"]?.inputs.batch_size)).toEqual([
      1, 1, 1,
    ])
    expect(jobs.map((one) => one.idempotencyKey)).toEqual([
      `${runId}-0`,
      `${runId}-1`,
      `${runId}-2`,
    ])
  })

  it("sends the start frame of each output to Wan 2.2 Fun Camera", async () => {
    const { workflows } = await submittedRun(
      {
        prompt,
        model: "wan-2-2",
        startFrame: [startFrameId],
        cameraMove: "pull-out",
        seed: 9,
      },
      2
    )
    expect(workflows.map((one) => one["108"]?.inputs.camera_pose)).toEqual([
      "Zoom Out",
      "Zoom Out",
    ])
    expect(workflows.map((one) => one["97"]?.inputs.image)).toEqual([
      asset,
      asset,
    ])
    expect(workflows.map((one) => one["102"]?.inputs.noise_seed)).toEqual([
      9, 10,
    ])
  })

  it("sends a clip to Fun Control at the length the run asked for", async () => {
    const { workflows } = await submittedRun(
      { prompt, clip: [clipId], length: 4, seed: 5 },
      1
    )
    expect(workflows).toHaveLength(1)
    expect(workflows[0]?.["158"]?.inputs.file).toEqual(asset)
    expect(workflows[0]?.["160"]?.inputs).toMatchObject({
      width: 848,
      height: 480,
      length: 65,
    })
  })
})
