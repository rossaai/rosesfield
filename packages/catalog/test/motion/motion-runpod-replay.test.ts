import {
  RunInputRefusedError,
  RunPodServerlessGenerationEngine,
} from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  both,
  clipId,
  fileGraph,
  filesWith,
  graphSchema,
  linksToMissingNodes,
  photoId,
  ReplayFetch,
  requestFor,
} from "./motion-replay"

const endpointUrl = "https://api.runpod.ai/v2/motion-endpoint"
const jobId = "sync-7a8b9c0d-motion"

const runBody = z.object({
  input: z.object({
    workflow: graphSchema,
    images: z.array(z.object({ name: z.string(), image: z.string() })),
  }),
  policy: z.object({ executionTimeout: z.number(), ttl: z.number() }),
})

function engineOn(replay: ReplayFetch): RunPodServerlessGenerationEngine {
  return new RunPodServerlessGenerationEngine({
    apiKey: "runpod-test",
    endpointId: "motion-endpoint",
    fetch: replay.fetch,
  })
}

describe("the motion request on RunPod Serverless", () => {
  it("sends one unkeyed run with the photo and the clip inline and named in the graph", async () => {
    const replay = new ReplayFetch([
      {
        method: "POST",
        url: `${endpointUrl}/run`,
        status: 200,
        json: { id: jobId, status: "IN_QUEUE" },
      },
    ])
    const submission = await engineOn(replay).submit(
      requestFor({ ...both, sound: "on", resolution: "480p" })
    )
    expect(submission.ref).toBe(jobId)
    expect(replay.sent).toHaveLength(1)
    expect(replay.sent[0]?.headers.has("Idempotency-Key")).toBe(false)
    const body = runBody.parse(replay.sent[0]?.body)
    expect(body.input.images.map((image) => image.name)).toEqual([
      `${photoId}.jpeg`,
      `${clipId}.mp4`,
    ])
    expect(body.policy).toEqual({
      executionTimeout: 1_800_000,
      ttl: 1_800_000,
    })
    const workflow = body.input.workflow
    expect(Object.keys(workflow)).toEqual(Object.keys(fileGraph()))
    expect(workflow).toMatchObject({
      "189": { inputs: { image: `${photoId}.jpeg` } },
      "240": { inputs: { file: `${clipId}.mp4` } },
      "702": { inputs: { value: 480 } },
      "597": { inputs: { noise_seed: 914 } },
      "245": { inputs: { audio: ["288", 1] } },
    })
    expect(linksToMissingNodes(workflow)).toEqual([])
  })

  it("refuses a clip whose request passes the 10 MB payload cap before any request", async () => {
    const replay = new ReplayFetch([])
    const large = new Uint8Array(8_000_000)
    await expect(
      engineOn(replay).submit(requestFor(both, filesWith(large)))
    ).rejects.toBeInstanceOf(RunInputRefusedError)
    expect(replay.sent).toEqual([])
  })
})
