import type { EngineBinding, RunInputs } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  type EngineRequest,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import {
  ltxFirstLastBinding,
  ltxStartFrameBinding,
  ltxTextBinding,
} from "#video/comfy/video-engine"
import { withoutVideoStills } from "../workflows/video-stills"
import {
  asset,
  jobId,
  lastFrameId,
  prompt,
  recorded,
  replayFetch,
  startFrameId,
  type Workflow,
} from "./video-recordings"

const coreNodes = new Set([
  "CLIPLoader",
  "CLIPTextEncode",
  "CreateVideo",
  "EmptyLTXVLatentVideo",
  "KSamplerSelect",
  "LTXVAddGuide",
  "LTXVAudioVAEDecode",
  "LTXVConcatAVLatent",
  "LTXVConditioning",
  "LTXVCropGuides",
  "LTXVDualCFGGuider",
  "LTXVEmptyLatentAudio",
  "LTXVImgToVideoInplace",
  "LTXVLatentUpsampler",
  "LTXVPreprocess",
  "LTXVSeparateAVLatent",
  "LatentUpscaleModelLoader",
  "LoadImage",
  "ManualSigmas",
  "RandomNoise",
  "ResizeImageMaskNode",
  "SamplerCustomAdvanced",
  "SaveVideo",
  "StringConcatenate",
  "UNETLoader",
  "VAEDecode",
  "VAEDecodeTiled",
  "VAELoader",
])

function filesOf(inputs: RunInputs): EngineFile[] {
  return Object.values(inputs)
    .filter((value) => Array.isArray(value))
    .flat()
    .map(
      (value): EngineFile => ({
        assetId: assetIdFormat.parse(value),
        kind: "image",
        mime: "image/png",
        bytes: Uint8Array.of(137, 80, 78, 71),
      })
    )
}

async function submitted(
  binding: EngineBinding,
  inputs: RunInputs,
  aspectRatio = "16:9"
) {
  const files = filesOf(inputs)
  const replay = replayFetch([
    ...files.map(() => recorded.upload),
    recorded.submit,
  ])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const request: EngineRequest = {
    idempotencyKey: "video-run-0001",
    binding,
    inputs,
    files,
    count: 1,
    aspectRatio,
    seed: 1234,
    outputKind: "video",
  }
  const submission = await engine.submit(request)
  const job = replay.sent.find((one) => one.url.endsWith("/api/v2/jobs"))
  const workflow: Workflow = withoutVideoStills(
    JSON.parse(job?.body ?? "{}").workflow
  )
  const uploads = replay.sent.filter((one) =>
    one.url.endsWith("/api/v2/assets")
  )
  return { submission, workflow, uploads }
}

function brokenLinks(workflow: Workflow): string[] {
  const broken: string[] = []
  for (const [id, node] of Object.entries(workflow)) {
    if (!coreNodes.has(node.class_type)) {
      broken.push(`${id}: ${node.class_type} is not a core node`)
    }
    for (const [name, value] of Object.entries(node.inputs)) {
      const isLink = Array.isArray(value) && typeof value[0] === "string"
      if (isLink && workflow[String(value[0])] === undefined) {
        broken.push(`${id}.${name} points to a missing node`)
      }
    }
  }
  return broken
}

describe("the Video engine request", () => {
  it("sends LTX 2.5 text with the camera words, the size, the frames and the seed", async () => {
    const { submission, workflow } = await submitted(
      ltxTextBinding("720p", "on"),
      { prompt, cameraMove: "push-in", length: 5 }
    )
    expect(submission.ref).toBe(jobId)
    expect(submission.models).toEqual([
      "ltx-2.5-22b-distilled-transformer-bf16.safetensors",
      "gemma4-12b-with-proj-ltx-2.5-bf16.safetensors",
      "ltx-2.5-video-vae-bf16.safetensors",
      "ltx-2.5-audio-vae-bf16.safetensors",
      "ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors",
    ])
    expect(submission.workflowHash).toMatch(/^[0-9a-f]{64}$/)
    expect(workflow["900"]?.inputs).toEqual({
      string_a: prompt,
      string_b: "\nThe camera moves slowly forward, toward the subject.",
      delimiter: "",
    })
    expect(workflow["364"]?.inputs.text).toEqual(["900", 0])
    expect(workflow["356"]?.inputs).toMatchObject({
      width: 672,
      height: 384,
      length: 121,
      batch_size: 1,
    })
    expect(workflow["366"]?.inputs.frames_number).toBe(121)
    expect(workflow["339"]?.inputs.noise_seed).toBe(1234)
    expect(workflow["370"]?.inputs).toMatchObject({
      fps: 24,
      audio: ["358", 0],
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends the prompt as written when the camera move is auto", async () => {
    const { workflow } = await submitted(
      ltxTextBinding("480p", "off"),
      {
        prompt,
        cameraMove: "auto",
        length: 3,
      },
      "9:16"
    )
    expect(workflow["900"]?.inputs.string_b).toBe("")
    expect(workflow["356"]?.inputs).toMatchObject({
      width: 256,
      height: 448,
      length: 73,
    })
    expect(workflow["370"]?.inputs).not.toHaveProperty("audio")
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends LTX 2.5 with a start frame as the uploaded asset and no last-frame guide", async () => {
    const { workflow } = await submitted(ltxStartFrameBinding("720p", "on"), {
      prompt,
      cameraMove: "static",
      length: 5,
      startFrame: [startFrameId],
    })
    expect(workflow["401"]?.inputs.image).toEqual(asset)
    expect(workflow["357"]?.inputs).toMatchObject({
      strength: 0.7,
      bypass: false,
    })
    const classes = Object.values(workflow).map((node) => node.class_type)
    expect(classes).not.toContain("LTXVAddGuide")
    expect(classes).not.toContain("LTXVCropGuides")
    expect(workflow["402"]).toBeUndefined()
    expect(workflow["377"]?.inputs.video_latent).toEqual(["357", 0])
    expect(workflow["388"]?.inputs).toMatchObject({
      positive: ["365", 0],
      negative: ["365", 1],
    })
    expect(workflow["348"]?.inputs.samples).toEqual(["367", 0])
    expect(workflow["340"]?.inputs.video_latent).toEqual(["349", 0])
    expect(workflow["391"]?.inputs).toMatchObject({
      positive: ["365", 0],
      negative: ["365", 1],
    })
    expect(workflow["374"]?.inputs.samples).toEqual(["369", 0])
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends LTX 2.5 with a first frame held at frame 0 and a last frame guided at the end of both stages", async () => {
    const { workflow, uploads } = await submitted(
      ltxFirstLastBinding("480p", "on"),
      {
        prompt,
        cameraMove: "auto",
        length: 5,
        startFrame: [startFrameId],
        lastFrame: [lastFrameId],
      }
    )
    expect(uploads).toHaveLength(2)
    expect(workflow["401"]?.inputs.image).toEqual(asset)
    expect(workflow["402"]?.inputs.image).toEqual(asset)
    expect(workflow["357"]?.inputs.image).toEqual(["350", 0])
    expect(workflow["349"]?.inputs.image).toEqual(["350", 0])
    expect(workflow["460"]?.inputs).toMatchObject({
      latent: ["357", 0],
      image: ["404", 0],
      frame_idx: -1,
      strength: 0.7,
    })
    expect(workflow["463"]?.inputs).toMatchObject({
      latent: ["349", 0],
      image: ["404", 0],
      frame_idx: -1,
      strength: 1,
    })
    expect(workflow["377"]?.inputs.video_latent).toEqual(["460", 2])
    expect(workflow["348"]?.inputs.samples).toEqual(["462", 2])
    expect(workflow["340"]?.inputs.video_latent).toEqual(["463", 2])
    expect(workflow["374"]?.inputs.samples).toEqual(["465", 2])
    expect(workflow["370"]?.inputs.audio).toEqual(["358", 0])
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("drops the audio track from a two-frame run with no sound", async () => {
    const { workflow } = await submitted(ltxFirstLastBinding("480p", "off"), {
      prompt,
      cameraMove: "auto",
      length: 5,
      startFrame: [startFrameId],
      lastFrame: [lastFrameId],
    })
    expect(workflow["370"]?.inputs).not.toHaveProperty("audio")
    expect(workflow["460"]?.class_type).toBe("LTXVAddGuide")
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("refuses a camera move the binding has no words for", async () => {
    await expect(
      submitted(ltxTextBinding("720p", "on"), {
        prompt,
        cameraMove: "orbit",
        length: 5,
      })
    ).rejects.toMatchObject({ code: "ENGINE_BINDING_INVALID" })
  })
})
