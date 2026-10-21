import { type AppDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { z } from "zod"
import { app } from "#lipsync/app"
import { photoWorkflow } from "#lipsync/comfy/photo-workflow"
import { readApps } from "#list-apps"
import { findWorkflow } from "#list-workflows"
import { apiGraph } from "#workflow-entry.contract"
import {
  type Recording,
  ReplayFetch,
} from "../../../generation/test/infrastructure/replay-fetch"

function parseLipsync(): AppDefinition {
  const [parsed] = readApps([{ folder: "lipsync", app }])
  if (parsed === undefined) {
    throw new Error("The lipsync app did not parse")
  }
  return parsed
}

type ApiWorkflow = z.infer<typeof apiGraph>

function photoGraph(): ApiWorkflow {
  return apiGraph.parse(findWorkflow(photoWorkflow)?.graph)
}

const lipsync = parseLipsync()
const photoModels = findWorkflow(photoWorkflow)?.models ?? []
const cloudUrl = "https://cloud.comfy.org"
const jobId = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a"
const photoId = assetIdFormat.parse("6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d")
const audioId = assetIdFormat.parse("8c9d0e1f-2a3b-4c4d-8e5f-6a7b8c9d0e1f")
const firstUpload = "9d0e1f2a-3b4c-4d5e-9f6a-7b8c9d0e1f2a"
const secondUpload = "0e1f2a3b-4c5d-4e6f-8a7b-8c9d0e1f2a3b"

const photoFile: EngineFile = {
  assetId: photoId,
  kind: "image",
  mime: "image/png",
  bytes: Uint8Array.of(137, 80, 78, 71),
}
const audioFile: EngineFile = {
  assetId: audioId,
  kind: "audio",
  mime: "audio/wav",
  bytes: Uint8Array.of(82, 73, 70, 70),
}

function uploaded(id: string, contentType: string): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: { id, content_type: contentType, created_new: true },
  }
}

const submitted: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: { id: jobId, status: "queued", outputs: [] },
}

type Body = { inputs: Record<string, unknown>; aspectRatio?: string }

function requestFor(body: Body): EngineRequest {
  const parsed = startRunBodyFor(lipsync).parse(body)
  return {
    idempotencyKey: "lipsync-run-1",
    binding: resolveBinding(lipsync.engine, parsed.inputs),
    inputs: parsed.inputs,
    files: [photoFile, audioFile],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 4242,
    outputKind: "video",
  }
}

function isWorkflow(value: unknown): value is ApiWorkflow {
  return typeof value === "object" && value !== null
}

async function submit(body: Body) {
  const replay = new ReplayFetch([
    uploaded(firstUpload, photoFile.mime),
    uploaded(secondUpload, audioFile.mime),
    submitted,
  ])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(requestFor(body))
  const job = replay.sent.find((sent) => sent.url.endsWith("/api/v2/jobs"))
  const sent: unknown = JSON.parse(job?.body ?? "null")
  const workflow =
    typeof sent === "object" && sent !== null && "workflow" in sent
      ? sent.workflow
      : null
  if (!isWorkflow(workflow)) {
    throw new Error("No workflow was sent")
  }
  return { submission, replay, job, workflow }
}

const asset = (id: string) => ({ __type: "core/ASSET", info: { id } })

function isLink(value: unknown): value is [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function linkOf(workflow: ApiWorkflow, node: string, name: string): string {
  const value = workflow[node]?.inputs[name]
  return isLink(value) ? value.join(":") : "none"
}

function audioProblems(workflow: ApiWorkflow): string[] {
  const problems = Object.entries(workflow).flatMap(([id, node]) =>
    Object.entries(node.inputs).flatMap(([name, value]) =>
      isLink(value) && !Object.hasOwn(workflow, value[0])
        ? [`${id}.${name} -> ${value[0]}`]
        : []
    )
  )
  const checks: readonly [string, string, string, string][] = [
    ["332", "audio", "276:0", "the trim does not read your audio"],
    ["328", "audio", "332:0", "the model does not encode your audio"],
    ["327", "samples", "328:0", "your audio latent is not held"],
    ["326", "audio_latent", "327:0", "the first stage denoises your audio"],
    ["312", "audio", "332:0", "the video does not carry your audio"],
  ]
  for (const [node, name, from, problem] of checks) {
    if (linkOf(workflow, node, name) !== from) {
      problems.push(problem)
    }
  }
  return problems
}

const photoBody = {
  mode: "photo",
  photo: [photoId],
  audio: [audioId],
}

describe("the engine request the Lip sync binding produces", () => {
  it("sends the photo, the audio and the scene to the LTX 2.3 graph sized for 1:1 and 5 seconds", async () => {
    const { submission, replay, job, workflow } = await submit({
      inputs: { ...photoBody, length: 5, scene: "A small kitchen" },
      aspectRatio: "1:1",
    })
    expect(submission.ref).toBe(jobId)
    expect(submission.models).toEqual([...photoModels])
    expect(submission.models).toContain("ltx-2.3-22b-dev-fp8.safetensors")
    expect(job?.headers.get("Idempotency-Key")).toBe("lipsync-run-1")
    expect(replay.unused()).toEqual([])
    expect(audioProblems(workflow)).toEqual([])
    expect(workflow).toMatchObject({
      "269": {
        class_type: "LoadImage",
        inputs: { image: asset(firstUpload) },
      },
      "276": {
        class_type: "LoadAudio",
        inputs: { audio: asset(secondUpload) },
      },
      "900": { inputs: { string_b: "A small kitchen" } },
      "286": { class_type: "RandomNoise", inputs: { noise_seed: 4242 } },
      "297": {
        inputs: { "resize_type.width": 512, "resize_type.height": 512 },
      },
      "302": {
        class_type: "EmptyLTXVLatentVideo",
        inputs: { width: 256, height: 256, length: 121 },
      },
      "333": { inputs: { width: 512, height: 512 } },
      "332": { class_type: "TrimAudioDuration", inputs: { duration: 5 } },
      "312": { class_type: "CreateVideo", inputs: { fps: 24 } },
      "341": { class_type: "SaveVideo", inputs: { format: "mp4" } },
    })
  })

  it("sizes a 9:16 run of 5.32 seconds to 512 by 896 and 129 frames", async () => {
    const { workflow } = await submit({
      inputs: { ...photoBody, length: 5.32 },
      aspectRatio: "9:16",
    })
    expect(workflow).toMatchObject({
      "297": {
        inputs: { "resize_type.width": 512, "resize_type.height": 896 },
      },
      "302": { inputs: { width: 256, height: 448, length: 129 } },
      "333": { inputs: { width: 512, height: 896 } },
    })
    expect(workflow["332"]?.inputs.duration).toBeCloseTo(16 / 3)
  })

  it("keeps the graph's talking line and leaves the scene empty when the run gives none", async () => {
    const written = photoGraph()["900"]?.inputs.string_a
    const { workflow } = await submit({ inputs: photoBody })
    expect(written).toEqual(expect.stringMatching(/talks to the camera/))
    expect(workflow["900"]?.inputs).toMatchObject({
      string_a: written,
      string_b: "",
    })
    expect(workflow["302"]?.inputs.length).toBe(241)
  })

  it("refuses a length off the step before anything reaches Comfy", () => {
    expect(
      startRunBodyFor(lipsync).safeParse({
        inputs: { ...photoBody, length: 3.25 },
      }).success
    ).toBe(false)
  })
})

describe("the control of the audio check", () => {
  it("flags the decoded audio on the video, a denoised audio latent and a link to a missing node", () => {
    const planted = photoGraph()
    const video = planted["312"]
    const concat = planted["326"]
    if (video === undefined || concat === undefined) {
      throw new Error("The workflow lost its video or its first stage")
    }
    video.inputs.audio = ["999", 0]
    concat.inputs.audio_latent = ["328", 0]
    expect(audioProblems(photoGraph())).toEqual([])
    expect(audioProblems(planted)).toEqual([
      "312.audio -> 999",
      "the first stage denoises your audio",
      "the video does not carry your audio",
    ])
  })
})
