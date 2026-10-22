import { startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { type AssetId, assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  musicWorkflow,
  soundWorkflow,
  voiceChangeWorkflow,
} from "#audio/comfy/audio-engine"
import { findWorkflow } from "#list-workflows"
import { cloudUrl, submitJob } from "../../image/comfy-recordings"
import { type Recording, ReplayFetch } from "../../image/replay-fetch"
import { audioDefinition } from "../audio-definition"

type EngineFile = EngineRequest["files"][number]

const audio = audioDefinition()
const sourceId = assetIdFormat.parse("8a7b6c5d-4e3f-4a2b-9c1d-0e9f8a7b6c5d")
const targetId = assetIdFormat.parse("1b2c3d4e-5f60-4a71-8b92-a3b4c5d6e7f8")
const uploadedIds = [
  "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a",
  "6e5d4c3b-2a1f-4e0d-9c8b-7a6f5e4d3c2b",
]
const mp3Bytes = Uint8Array.of(73, 68, 51, 4, 0, 0, 0, 0, 0, 0)
const script = "The shop opens at nine on weekdays."

function uploadOf(id: string): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: {
      id,
      hash: `blake3:${id.slice(0, 8)}`,
      size_bytes: 10,
      content_type: "audio/mpeg",
      file_path: `${id}.mp3`,
      created_new: true,
      created_at: "2026-10-20T09:00:00Z",
      url: `${cloudUrl}/api/v2/assets/${id}/content`,
      url_expires_at: "2026-10-20T10:00:00Z",
    },
  }
}

function fileOf(assetId: AssetId): EngineFile {
  return { assetId, kind: "audio", mime: "audio/mpeg", bytes: mp3Bytes }
}

const sentBody = z.object({
  workflow: z.record(
    z.string(),
    z.object({
      class_type: z.string(),
      inputs: z.record(z.string(), z.unknown()),
    })
  ),
})

type Sent = z.infer<typeof sentBody>["workflow"]

function requestFor(
  inputs: Record<string, unknown>,
  files: EngineFile[] = []
): EngineRequest {
  const parsed = startRunBodyFor(audio).parse({ inputs, count: 1 })
  return {
    idempotencyKey: "audio-run-1:0",
    binding: resolveBinding(audio.engine, parsed.inputs),
    inputs: parsed.inputs,
    files,
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 7,
    outputKind: "audio",
  }
}

async function sent(
  request: EngineRequest,
  uploads: number
): Promise<{ workflow: Sent; urls: string[] }> {
  const uploaded = uploadedIds.slice(0, uploads).map(uploadOf)
  const replay = new ReplayFetch([...uploaded, submitJob])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  await engine.submit(request)
  const { workflow } = sentBody.parse(replay.bodyOf("/api/v2/jobs"))
  return { workflow, urls: replay.sent.map((one) => one.url) }
}

function nodeIdsOf(workflow: string): string[] {
  return Object.keys(findWorkflow(workflow)?.graph ?? {})
}

describe("each audio tab runs its graph", () => {
  it("Speech reads the script in Chatterbox's own voice", async () => {
    const { workflow, urls } = await sent(requestFor({ script }), 0)
    expect(urls).toEqual([`${cloudUrl}/api/v2/jobs`])
    expect(workflow["2"]).toBeUndefined()
    expect(workflow["1"]?.class_type).toBe("FL_ChatterboxMultilingualTTS")
    expect(workflow["1"]?.inputs).not.toHaveProperty("audio_prompt")
    expect(workflow["1"]?.inputs).toMatchObject({
      text: script,
      language: "English (en)",
      seed: 7,
    })
  })

  it("Voice clone reads the script in the voice of the recording", async () => {
    const inputs = { mode: "clone", script, recording: [sourceId] }
    const request = requestFor(inputs, [fileOf(sourceId)])
    const { workflow } = await sent(request, 1)
    expect(workflow).toMatchObject({
      "1": { inputs: { text: script, audio_prompt: ["2", 0] } },
      "2": {
        class_type: "LoadAudio",
        inputs: { audio: { info: { id: uploadedIds[0] } } },
      },
    })
  })

  it("Voice change sends your recording and the target voice", async () => {
    const inputs = { mode: "change", source: [sourceId], target: [targetId] }
    const request = requestFor(inputs, [fileOf(sourceId), fileOf(targetId)])
    const audioAt = (node: string) => [node, "inputs", "audio"]
    expect(request.binding.config.bindings).toEqual([
      { from: "input", name: "source", index: 0, path: audioAt("3") },
      { from: "input", name: "target", index: 0, path: audioAt("2") },
      { from: "seed", path: ["1", "inputs", "seed"] },
    ])
    const { workflow } = await sent(request, 2)
    expect(Object.keys(workflow)).toEqual(nodeIdsOf(voiceChangeWorkflow))
    const loaded = ["3", "2"].map((id) => workflow[id]?.inputs.audio)
    expect(loaded).toEqual(
      expect.arrayContaining(
        uploadedIds.map((id) => ({ __type: "core/ASSET", info: { id } }))
      )
    )
    expect(workflow["1"]).toMatchObject({
      class_type: "FL_ChatterboxVC",
      inputs: { input_audio: ["5", 0], target_voice: ["2", 0], seed: 7 },
    })
  })

  it("Music asks MiniMax-Music3 for 5 seconds from a description", async () => {
    const description = "a slow piano song with soft rain"
    const request = requestFor({ mode: "music", description, length: 5 })
    const { workflow } = await sent(request, 0)
    expect(Object.keys(workflow)).toEqual(nodeIdsOf(musicWorkflow))
    expect(workflow["13"]).toMatchObject({
      class_type: "MiniMaxMusic3TextEncode",
      inputs: { caption: description, lyrics: "", max_duration: 5, seed: 7 },
    })
    expect(workflow["9"]?.inputs).toMatchObject({ seed: 7 })
    expect(workflow["15"]?.inputs).toMatchObject({ seconds: ["13", 1] })
  })

  it("Sound effects asks Stable Audio 3 Medium for 5 seconds", async () => {
    const description = "a door creaks open"
    const request = requestFor({ mode: "sound", description, length: 5 })
    const { workflow } = await sent(request, 0)
    expect(Object.keys(workflow)).toEqual(nodeIdsOf(soundWorkflow))
    expect(workflow["6"]?.inputs).toMatchObject({ text: description })
    expect(workflow["7"]?.inputs).toMatchObject({ text: "" })
    expect(workflow["11"]?.inputs).toMatchObject({ seconds: 5 })
    expect(workflow["3"]?.inputs).toMatchObject({ seed: 7 })
    expect(workflow["25"]?.inputs).toMatchObject({
      ckpt_name: "stable_audio_3_medium.safetensors",
    })
  })

  it("makes one output per job on every graph, so a count of 3 runs 3 seeds", () => {
    const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test" })
    const each = [
      requestFor({ script }),
      requestFor({ mode: "clone", script, recording: [sourceId] }),
      requestFor({ mode: "change", source: [sourceId], target: [targetId] }),
      requestFor({ mode: "music", description: "a song" }),
      requestFor({ mode: "sound", description: "rain" }),
    ]
    for (const request of each) {
      expect(engine.outputsPerJob(request.binding)).toBe("one")
    }
  })
})
