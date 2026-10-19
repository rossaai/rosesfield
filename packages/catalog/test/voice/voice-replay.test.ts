import { type AppDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { readApps } from "#list-apps"
import { findWorkflow } from "#list-workflows"
import { app } from "#voice/app"
import { voiceWorkflow } from "#voice/comfy/voice-binding"
import { cloudUrl, submitJob } from "../image/comfy-recordings"
import { type Recording, ReplayFetch } from "../image/replay-fetch"

function parseVoice(): AppDefinition {
  const [parsed] = readApps([{ folder: "voice", app }])
  if (parsed === undefined) {
    throw new Error("The voice app did not parse")
  }
  return parsed
}

const voice = parseVoice()
const recordingId = assetIdFormat.parse("8a7b6c5d-4e3f-4a2b-9c1d-0e9f8a7b6c5d")
const uploadedId = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a"
const mp3Bytes = Uint8Array.of(73, 68, 51, 4, 0, 0, 0, 0, 0, 0)
const script = "The shop opens at nine on weekdays and at ten on Saturdays."

const upload: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/assets`,
  status: 201,
  json: {
    id: uploadedId,
    hash: "blake3:5d4c3b2a",
    size_bytes: 10,
    content_type: "audio/mpeg",
    file_path: "voice.mp3",
    created_new: true,
    created_at: "2026-10-17T09:00:00Z",
    url: `${cloudUrl}/api/v2/assets/${uploadedId}/content`,
    url_expires_at: "2026-10-17T10:00:00Z",
  },
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

function requestFor(
  inputs: Record<string, unknown>,
  files: EngineRequest["files"] = []
): EngineRequest {
  const parsed = startRunBodyFor(voice).parse({ inputs, count: 1 })
  return {
    idempotencyKey: "voice-run-1:0",
    binding: resolveBinding(voice.engine, parsed.inputs),
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
  recordings: readonly Recording[]
): Promise<{ workflow: z.infer<typeof sentBody>["workflow"]; urls: string[] }> {
  const replay = new ReplayFetch(recordings)
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  await engine.submit(request)
  const { workflow } = sentBody.parse(replay.bodyOf("/api/v2/jobs"))
  return { workflow, urls: replay.sent.map((one) => one.url) }
}

describe("the voice binding", () => {
  it("clones the voice of a recording with the Chatterbox workflow of workflows/", async () => {
    const request = requestFor(
      {
        mode: "recording",
        script,
        language: "es",
        recording: [recordingId],
        expression: 0.8,
      },
      [
        {
          assetId: recordingId,
          kind: "audio",
          mime: "audio/mpeg",
          bytes: mp3Bytes,
        },
      ]
    )
    const { workflow, urls } = await sent(request, [upload, submitJob])
    expect(urls).toEqual([
      `${cloudUrl}/api/v2/assets`,
      `${cloudUrl}/api/v2/jobs`,
    ])
    expect(Object.keys(workflow)).toEqual(
      Object.keys(findWorkflow(voiceWorkflow)?.graph ?? {})
    )
    expect(workflow).toMatchObject({
      "1": {
        class_type: "FL_ChatterboxMultilingualTTS",
        inputs: {
          text: script,
          language: "Spanish (es)",
          exaggeration: 0.8,
          seed: 7,
          audio_prompt: ["2", 0],
        },
      },
      "2": {
        class_type: "LoadAudio",
        inputs: { audio: { __type: "core/ASSET", info: { id: uploadedId } } },
      },
      "3": { class_type: "SaveAudioMP3", inputs: { audio: ["1", 0] } },
    })
  })

  it("reads the script in the model's own voice with no LoadAudio node", async () => {
    const request = requestFor({ mode: "model", script })
    const { workflow, urls } = await sent(request, [submitJob])
    expect(urls).toEqual([`${cloudUrl}/api/v2/jobs`])
    expect(workflow["2"]).toBeUndefined()
    expect(workflow["1"]?.inputs).not.toHaveProperty("audio_prompt")
    expect(workflow["1"]?.inputs).toMatchObject({
      text: script,
      language: "English (en)",
      exaggeration: 0.5,
    })
  })

  it("makes one output per job, so a count of 3 runs 3 seeds", () => {
    const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test" })
    const withRecording = requestFor(
      { mode: "recording", script, recording: [recordingId] },
      []
    ).binding
    const without = requestFor({ script }).binding
    expect(engine.outputsPerJob(withRecording)).toBe("one")
    expect(engine.outputsPerJob(without)).toBe("one")
  })

  it("refuses an empty script and a language the model does not speak", () => {
    expect(() => requestFor({ script: "  " })).toThrow()
    expect(() => requestFor({ script, language: "xx" })).toThrow()
  })

  it("asks for a recording only in Use a recording", () => {
    const body = startRunBodyFor(voice)
    const issues = (inputs: Record<string, unknown>) => {
      const result = body.safeParse({ inputs, count: 1 })
      return result.success
        ? []
        : result.error.issues.map((issue) => issue.path.join("."))
    }
    expect(issues({ mode: "recording", script })).toEqual(["inputs.recording"])
    expect(issues({ mode: "model", script, recording: [recordingId] })).toEqual(
      ["inputs.recording"]
    )
    expect(issues({ mode: "sing", script })).toEqual(["inputs.mode"])
    expect(
      issues({ mode: "recording", script, recording: [recordingId] })
    ).toEqual([])
    expect(issues({ script })).toEqual([])
  })
})
