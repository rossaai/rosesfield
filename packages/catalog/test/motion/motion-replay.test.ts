import { ComfyGenerationEngine } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { withoutVideoStills } from "../workflows/video-stills"
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
      node_id: "68",
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
  return {
    submission,
    replay,
    job,
    workflow: withoutVideoStills(workflow),
  }
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
  set("200", "image", asset(photoUpload))
  set("199", "file", asset(clipUpload))
  set("900", "string_b", values.scene)
  set("702", "value", values.shortSide)
  set("704", "seed", 914)
  if (values.sound === "off") {
    delete graph["122"]?.inputs.audio
  }
  return graph
}

describe("the motion request on the Comfy API v2", () => {
  it("uploads the photo and the clip, then sends one keyed job with the five model files of the LTX 2.3 graph", async () => {
    const { submission, replay, job } = await submitted({
      ...both,
      scene: "A quiet beach at dawn, soft light",
      resolution: "480p",
    })
    expect(submission.ref).toBe(jobId)
    expect(submission.models).toEqual([
      "ltx-2.3-22b-distilled-fp8.safetensors",
      "ltx-2.3-22b-ic-lora-union-control-ref0.5.safetensors",
      "gemma_3_12B_it_fp4_mixed.safetensors",
      "sdpose_wholebody_fp16.safetensors",
      "rt_detr_v4-x-hgnet_fp16.safetensors",
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

  it("sends the graph of workflows/motion-ltx-2-3-ic-lora with only the bound values set, sound off", async () => {
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
    expect(workflow["122"]?.inputs).not.toHaveProperty("audio")
  })

  it("links the clip's own sound into the video when Keep the clip's sound is on, at 704 pixels for 720p", async () => {
    const { workflow } = await submitted({ ...both, sound: "on" })
    expect(workflow).toEqual(
      expectedGraph({ scene: "", shortSide: 704, sound: "on" })
    )
    expect(workflow["122"]?.inputs).toMatchObject({
      audio: ["706", 1],
      fps: ["706", 2],
    })
    expect(workflow["706"]?.inputs).toEqual({ video: ["692", 0] })
    expect(workflow["692"]?.inputs).toMatchObject({ video: ["199", 0] })
  })

  it("gives the two sound graphs different workflow hashes", async () => {
    const quiet = await submitted(both)
    const kept = await submitted({ ...both, sound: "on" })
    expect(quiet.workflow["122"]?.inputs).not.toHaveProperty("audio")
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
