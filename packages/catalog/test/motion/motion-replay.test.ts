import { ComfyGenerationEngine } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import {
  both,
  fileGraph,
  type Graph,
  graphSchema,
  linksToMissingNodes,
  type Recording,
  ReplayFetch,
  requestFor,
} from "./motion-replay"

const cloudUrl = "https://cloud.comfy.org"
const jobId = "6e5d4c3b-2a1f-4e0d-9c8b-7a6f5e4d3c2b"
const photoUpload = "3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f"
const clipUpload = "4d5e6f7a-8b9c-4d0e-9f2a-3b4c5d6e7f80"
const outputId = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b"
const mp4 = Uint8Array.of(0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109)

function uploaded(id: string, contentType: string): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: { id, content_type: contentType, created_new: true },
  }
}

const submitRecordings = (): Recording[] => [
  uploaded(photoUpload, "image/jpeg"),
  uploaded(clipUpload, "video/mp4"),
  {
    method: "POST",
    url: `${cloudUrl}/api/v2/jobs`,
    status: 201,
    json: { id: jobId, status: "queued", outputs: [] },
  },
]

const succeeded = {
  id: jobId,
  status: "succeeded",
  outputs: [
    {
      id: outputId,
      node_id: "246",
      type: "video",
      content_type: "video/mp4",
    },
  ],
}

function engineOn(replay: ReplayFetch): ComfyGenerationEngine {
  return new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
}

async function submitted(inputs: Record<string, unknown>) {
  const replay = new ReplayFetch(submitRecordings())
  const submission = await engineOn(replay).submit(requestFor(inputs))
  const job = replay.sent.find((sent) => sent.url.endsWith("/jobs"))
  const body = job?.body
  const workflow = graphSchema.parse(
    typeof body === "object" && body !== null && "workflow" in body
      ? body.workflow
      : null
  )
  return { submission, replay, job, workflow }
}

const asset = (id: string) => ({ __type: "core/ASSET", info: { id } })

function expectedGraph(values: {
  scene: string
  shortSide: number
  sound: "on" | "off"
}): Graph {
  const graph = fileGraph()
  const set = (id: string, name: string, value: unknown): void => {
    const node = graph[id]
    if (node === undefined) {
      throw new Error(`The workflow file has no node ${id}`)
    }
    node.inputs[name] = value
  }
  set("189", "image", asset(photoUpload))
  set("240", "file", asset(clipUpload))
  set("582", "text", values.scene)
  set("702", "value", values.shortSide)
  set("597", "noise_seed", 914)
  if (values.sound === "off") {
    delete graph["245"]?.inputs.audio
  }
  return graph
}

describe("the motion request on the Comfy API v2", () => {
  it("uploads the photo and the clip, then sends one keyed job with the four model files", async () => {
    const { submission, replay, job } = await submitted({
      ...both,
      scene: "A quiet beach at dawn, soft light",
      resolution: "480p",
    })
    expect(submission.ref).toBe(jobId)
    expect(submission.models).toEqual([
      "wan_animate_2_distill_int8_convrot.safetensors",
      "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
      "clip_vision_h.safetensors",
      "Wan2_1_VAE_bf16.safetensors",
    ])
    expect(replay.sent.map((sent) => sent.url)).toEqual([
      `${cloudUrl}/api/v2/assets`,
      `${cloudUrl}/api/v2/assets`,
      `${cloudUrl}/api/v2/jobs`,
    ])
    expect(replay.sent.map((sent) => sent.form.get("content_type"))).toEqual([
      "image/jpeg",
      "video/mp4",
      null,
    ])
    expect(job?.headers.get("Idempotency-Key")).toBe("motion-run-1")
    expect(replay.unused()).toEqual([])
  })

  it("sends the graph of workflows/motion-wan-animate-2 with only the bound values set, sound off", async () => {
    const { workflow } = await submitted({
      ...both,
      scene: "A quiet beach at dawn, soft light",
      resolution: "480p",
    })
    expect(workflow).toEqual(
      expectedGraph({
        scene: "A quiet beach at dawn, soft light",
        shortSide: 480,
        sound: "off",
      })
    )
  })

  it("sends the same graph with the clip's audio linked into the video when Keep the clip's sound is on", async () => {
    const { workflow } = await submitted({ ...both, sound: "on" })
    expect(workflow).toEqual(
      expectedGraph({ scene: "", shortSide: 720, sound: "on" })
    )
    expect(workflow["245"]?.inputs).toMatchObject({
      audio: ["288", 1],
      fps: ["288", 2],
    })
  })

  it("gives the two sound graphs different workflow hashes", async () => {
    const quiet = await submitted(both)
    const kept = await submitted({ ...both, sound: "on" })
    expect(quiet.workflow["245"]?.inputs).not.toHaveProperty("audio")
    expect(quiet.submission.workflowHash).not.toBe(kept.submission.workflowHash)
  })

  it("links every input of both sound graphs to a node the graph holds", async () => {
    for (const sound of ["off", "on"]) {
      const { workflow } = await submitted({ ...both, sound })
      expect(Object.keys(workflow).length).toBeGreaterThan(40)
      expect(linksToMissingNodes(workflow)).toEqual([])
    }
  })

  it("reads a finished job and downloads its one MP4 from the output node", async () => {
    const replay = new ReplayFetch([
      {
        method: "GET",
        url: `${cloudUrl}/api/v2/jobs/${jobId}`,
        status: 200,
        json: succeeded,
      },
      {
        method: "GET",
        url: `${cloudUrl}/api/v2/jobs/${jobId}`,
        status: 200,
        json: succeeded,
      },
      {
        method: "GET",
        url: `${cloudUrl}/api/v2/assets/${outputId}/content`,
        status: 200,
        bytes: mp4,
        contentType: "video/mp4",
      },
    ])
    const engine = engineOn(replay)
    expect(await engine.read(jobId)).toEqual({ state: "succeeded" })
    const outputs = await engine.listOutputs(jobId)
    expect(outputs).toHaveLength(1)
    expect(outputs[0]).toMatchObject({ kind: "video", mime: "video/mp4" })
    expect(Array.from(outputs[0]?.bytes ?? [])).toEqual(Array.from(mp4))
    expect(replay.unused()).toEqual([])
  })
})
