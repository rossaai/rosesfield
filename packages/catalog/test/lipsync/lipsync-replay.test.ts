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
import { clipWorkflow } from "#lipsync/comfy/clip-workflow"
import {
  framesMadeBy,
  lengthValues,
  passCount,
  windowOf,
} from "#lipsync/comfy/lipsync-frames"
import { passNode, photoWorkflow } from "#lipsync/comfy/photo-workflow"
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

function workflowOf(id: string) {
  const workflow = findWorkflow(id)
  if (workflow === null) {
    throw new Error(`No workflow ${id}`)
  }
  return { models: [...workflow.models], graph: apiGraph.parse(workflow.graph) }
}

const lipsync = parseLipsync()
const photoEntry = workflowOf(photoWorkflow)
const clipEntry = workflowOf(clipWorkflow)
const writtenScene = photoEntry.graph["9"]?.inputs.text
const cloudUrl = "https://cloud.comfy.org"
const jobId = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a"
const photoId = assetIdFormat.parse("6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d")
const clipId = assetIdFormat.parse("7b8c9d0e-1f2a-4b3c-9d4e-5f6a7b8c9d0e")
const audioId = assetIdFormat.parse("8c9d0e1f-2a3b-4c4d-8e5f-6a7b8c9d0e1f")
const firstUpload = "9d0e1f2a-3b4c-4d5e-9f6a-7b8c9d0e1f2a"
const secondUpload = "0e1f2a3b-4c5d-4e6f-8a7b-8c9d0e1f2a3b"

const photoFile: EngineFile = {
  assetId: photoId,
  kind: "image",
  mime: "image/png",
  bytes: Uint8Array.of(137, 80, 78, 71),
}
const clipFile: EngineFile = {
  assetId: clipId,
  kind: "video",
  mime: "video/mp4",
  bytes: Uint8Array.of(0, 0, 0, 24),
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

function requestFor(body: Body, files: readonly EngineFile[]): EngineRequest {
  const parsed = startRunBodyFor(lipsync).parse(body)
  return {
    idempotencyKey: "lipsync-run-1",
    binding: resolveBinding(lipsync.engine, parsed.inputs),
    inputs: parsed.inputs,
    files,
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 4242,
    outputKind: "video",
  }
}

function isWorkflow(value: unknown): value is ApiWorkflow {
  return typeof value === "object" && value !== null
}

async function submit(body: Body, files: readonly EngineFile[]) {
  const replay = new ReplayFetch([
    uploaded(firstUpload, files[0]?.mime ?? ""),
    uploaded(secondUpload, files[1]?.mime ?? ""),
    submitted,
  ])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(requestFor(body, files))
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

function danglingLinks(workflow: ApiWorkflow): string[] {
  return Object.entries(workflow).flatMap(([id, node]) =>
    Object.entries(node.inputs).flatMap(([name, value]) =>
      isLink(value) && !Object.hasOwn(workflow, value[0])
        ? [`${id}.${name} -> ${value[0]}`]
        : []
    )
  )
}

function chainProblems(workflow: ApiWorkflow): string[] {
  const problems = danglingLinks(workflow)
  for (let pass = 2; pass <= passCount; pass += 1) {
    const before =
      pass === 2 ? `${passNode(1, 6)}:0` : `${passNode(pass - 1, 8)}:0`
    const talk = passNode(pass, 1)
    if (linkOf(workflow, talk, "previous_frames") !== before) {
      problems.push(`pass ${pass} does not read every frame made before it`)
    }
    if (linkOf(workflow, passNode(pass, 7), "batch_index") !== `${talk}:4`) {
      problems.push(`pass ${pass} keeps the frames it carried over`)
    }
  }
  return problems
}

const photoBody = {
  mode: "photo",
  photo: [photoId],
  audio: [audioId],
}

const clipBody = {
  inputs: { mode: "clip", clip: [clipId], audio: [audioId], length: 5 },
  aspectRatio: "9:16",
}

const clipShape = {
  "1": { class_type: "LoadVideo", inputs: { file: asset(firstUpload) } },
  "2": { class_type: "LoadAudio", inputs: { audio: asset(secondUpload) } },
  "4": { class_type: "ImageScale", inputs: { width: 480, height: 832 } },
  "15": {
    class_type: "MultiTalkWav2VecEmbeds",
    inputs: { num_frames: 125, audio_1: ["2", 0] },
  },
  "19": { inputs: { width: 480, height: 832, mode: "infinitetalk" } },
  "21": { class_type: "WanVideoSampler", inputs: { seed: 4242 } },
  "900": { inputs: { length: 125 } },
  "901": { inputs: { audio: ["2", 0] } },
}

describe("the engine request the Lip sync binding produces", () => {
  it("sends the photo, the audio and the scene to 4 chained passes sized for 16:9 and 81 frames", async () => {
    const { submission, replay, job, workflow } = await submit(
      {
        inputs: {
          ...photoBody,
          length: 3.24,
          scene: "A small kitchen in morning light",
        },
        aspectRatio: "16:9",
      },
      [photoFile, audioFile]
    )
    expect(submission.ref).toBe(jobId)
    expect(submission.models).toEqual(photoEntry.models)
    expect(submission.models).toContain(
      "wan2.1_infiniteTalk_single_fp16.safetensors"
    )
    expect(job?.headers.get("Idempotency-Key")).toBe("lipsync-run-1")
    expect(replay.unused()).toEqual([])
    expect(chainProblems(workflow)).toEqual([])
    const window = windowOf(81)
    expect(window).toBe(29)
    expect(workflow).toMatchObject({
      "1": { class_type: "LoadImage", inputs: { image: asset(firstUpload) } },
      "2": { class_type: "LoadAudio", inputs: { audio: asset(secondUpload) } },
      "9": { inputs: { text: "A small kitchen in morning light" } },
      "900": { class_type: "ImageFromBatch", inputs: { length: 81 } },
      "901": {
        class_type: "CreateVideo",
        inputs: { fps: 25, audio: ["2", 0] },
      },
      "902": { class_type: "SaveVideo", inputs: { format: "mp4" } },
    })
    for (let pass = 1; pass <= passCount; pass += 1) {
      expect(workflow[passNode(pass, 1)]).toMatchObject({
        class_type: "WanInfiniteTalkToVideo",
        inputs: {
          mode: "single_speaker",
          width: 832,
          height: 480,
          length: window,
          motion_frame_count: 9,
        },
      })
      expect(workflow[passNode(pass, 2)]).toMatchObject({
        inputs: { noise_seed: 4242 },
      })
      expect(workflow[passNode(pass, 4)]).toMatchObject({
        inputs: { steps: 6 },
      })
    }
    expect(workflow[passNode(1, 1)]?.inputs).not.toHaveProperty(
      "previous_frames"
    )
  })

  it("keeps the written scene and sizes 10 seconds at 1:1 when the run gives no scene and no format", async () => {
    expect(writtenScene).toEqual(expect.stringMatching(/\S/))
    const { workflow } = await submit({ inputs: photoBody }, [
      photoFile,
      audioFile,
    ])
    expect(workflow).toMatchObject({
      "9": { inputs: { text: writtenScene } },
      "900": { inputs: { length: 250 } },
      "101": { inputs: { width: 480, height: 480, length: 73 } },
      "401": { inputs: { width: 480, height: 480, length: 73 } },
    })
  })

  it("makes at least as many frames as the audio holds at every length, in windows the node takes", () => {
    const misses = lengthValues.flatMap((seconds) => {
      const frames = Math.round(seconds * 25)
      const window = windowOf(frames)
      const made = framesMadeBy(window)
      return made >= frames && made - frames < 16 && window % 4 === 1
        ? []
        : [`${seconds} s: window ${window}, ${made} frames for ${frames}`]
    })
    expect(lengthValues).toHaveLength(201)
    expect(misses).toEqual([])
  })

  it("sends the clip and the audio to the clip workflow, with the frame count, the 9:16 size and the seed", async () => {
    const { submission, replay, job, workflow } = await submit(clipBody, [
      clipFile,
      audioFile,
    ])
    expect(submission.models).toEqual(clipEntry.models)
    expect(submission.models).toContain(
      "Wan2_1-InfiniTetalk-Single_fp16.safetensors"
    )
    expect(job?.headers.get("Idempotency-Key")).toBe("lipsync-run-1")
    expect(replay.unused()).toEqual([])
    expect(danglingLinks(workflow)).toEqual([])
    expect(workflow).toMatchObject(clipShape)
  })

  it("refuses a length off the frame step before anything reaches Comfy", () => {
    expect(
      startRunBodyFor(lipsync).safeParse({
        inputs: { ...photoBody, length: 3.25 },
      }).success
    ).toBe(false)
  })
})

describe("the control of the pass check", () => {
  it("flags the chain when a pass reads only the pass before it, or keeps its carried frames, or links to a missing node", () => {
    const planted: ApiWorkflow = apiGraph.parse(
      findWorkflow(photoWorkflow)?.graph
    )
    const third = planted[passNode(3, 1)]
    const kept = planted[passNode(4, 7)]
    if (third === undefined || kept === undefined) {
      throw new Error("The workflow lost a pass")
    }
    third.inputs.previous_frames = [passNode(2, 6), 0]
    kept.inputs.batch_index = 0
    planted["902"] = {
      class_type: "SaveVideo",
      inputs: { video: ["999", 0] },
    }
    expect(
      chainProblems(apiGraph.parse(findWorkflow(photoWorkflow)?.graph))
    ).toEqual([])
    expect(chainProblems(planted)).toEqual([
      "902.video -> 999",
      "pass 3 does not read every frame made before it",
      "pass 4 keeps the frames it carried over",
    ])
  })
})

describe("the control of the clip request check", () => {
  it("flags a clip run sent to the photo workflow, or sized for 3 seconds", async () => {
    const photoMode = await submit(
      {
        inputs: {
          mode: "photo",
          photo: [photoId],
          audio: [audioId],
          length: 5,
        },
        aspectRatio: "9:16",
      },
      [photoFile, audioFile]
    )
    const short = await submit(
      { ...clipBody, inputs: { ...clipBody.inputs, length: 3 } },
      [clipFile, audioFile]
    )
    expect(() => expect(photoMode.workflow).toMatchObject(clipShape)).toThrow()
    expect(() => expect(short.workflow).toMatchObject(clipShape)).toThrow()
    expect(photoMode.submission.models).not.toEqual(clipEntry.models)
  })
})
