import type { EngineBinding, RunInputs } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
} from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import {
  ltxStartFrameBinding,
  ltxTextBinding,
  wanCameraBinding,
  wanClipBinding,
  wanStartFrameBinding,
  wanTextBinding,
} from "#video/comfy/video-engine"
import {
  asset,
  jobId,
  prompt,
  recorded,
  replayFetch,
  startFrameId,
  type Workflow,
} from "./video-recordings"

const coreNodes = new Set([
  "CLIPLoader",
  "CLIPTextEncode",
  "Canny",
  "CreateVideo",
  "EmptyHunyuanLatentVideo",
  "EmptyLTXVLatentVideo",
  "GetVideoComponents",
  "ImageFromBatch",
  "KSamplerAdvanced",
  "KSamplerSelect",
  "LTXVAudioVAEDecode",
  "LTXVConcatAVLatent",
  "LTXVConditioning",
  "LTXVDualCFGGuider",
  "LTXVEmptyLatentAudio",
  "LTXVImgToVideoInplace",
  "LTXVLatentUpsampler",
  "LTXVPreprocess",
  "LTXVSeparateAVLatent",
  "LatentUpscaleModelLoader",
  "LoadImage",
  "LoadVideo",
  "ManualSigmas",
  "ModelSamplingSD3",
  "RandomNoise",
  "ResizeImageMaskNode",
  "SamplerCustomAdvanced",
  "SaveVideo",
  "StringConcatenate",
  "UNETLoader",
  "VAEDecode",
  "VAEDecodeTiled",
  "VAELoader",
  "Wan22FunControlToVideo",
  "WanCameraEmbedding",
  "WanCameraImageToVideo",
  "WanImageToVideo",
])

async function submitted(
  binding: EngineBinding,
  inputs: RunInputs,
  aspectRatio = "16:9"
) {
  const withFile = Object.values(inputs).some(Array.isArray)
  const replay = replayFetch(
    withFile ? [recorded.upload, recorded.submit] : [recorded.submit]
  )
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const request: EngineRequest = {
    idempotencyKey: "video-run-0001",
    binding,
    inputs,
    files: withFile
      ? [
          {
            assetId: startFrameId,
            kind: "image",
            mime: "image/png",
            bytes: Uint8Array.of(137, 80, 78, 71),
          },
        ]
      : [],
    count: 1,
    aspectRatio,
    seed: 1234,
    outputKind: "video",
  }
  const submission = await engine.submit(request)
  const job = replay.sent.find((one) => one.url.endsWith("/api/v2/jobs"))
  const workflow: Workflow = JSON.parse(job?.body ?? "{}").workflow
  return { submission, workflow }
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
    expect(submission.models).toEqual(["Lightricks/LTX-2.5"])
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

  it("sends LTX 2.5 with a start frame as the uploaded asset", async () => {
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
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends Wan 2.2 text at 480p and 16 frames per second", async () => {
    const { submission, workflow } = await submitted(
      wanTextBinding(),
      {
        prompt,
        cameraMove: "crane-up",
        length: 2,
      },
      "4:3"
    )
    expect(submission.models).toEqual(["Wan-AI/Wan2.2-T2V-A14B"])
    expect(workflow["900"]?.inputs.string_b).toBe(
      "\nThe camera rises slowly straight up."
    )
    expect(workflow["74"]?.inputs).toMatchObject({
      width: 640,
      height: 480,
      length: 33,
    })
    expect(workflow["81"]?.inputs).toMatchObject({
      noise_seed: 1234,
      steps: 20,
    })
    expect(workflow["88"]?.inputs.fps).toBe(16)
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends a Wan 2.2 start frame with no camera words", async () => {
    const { workflow } = await submitted(wanStartFrameBinding(), {
      prompt,
      length: 5,
      startFrame: [startFrameId],
    })
    expect(workflow["93"]?.inputs.text).toBe(prompt)
    expect(workflow["97"]?.inputs.image).toEqual(asset)
    expect(workflow["98"]?.inputs).toMatchObject({
      width: 848,
      height: 480,
      length: 81,
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it.each([
    { cameraMove: "static", pose: "Static" },
    { cameraMove: "push-in", pose: "Zoom In" },
    { cameraMove: "pull-out", pose: "Zoom Out" },
    { cameraMove: "track-left", pose: "Pan Left" },
    { cameraMove: "track-right", pose: "Pan Right" },
    { cameraMove: "crane-up", pose: "Pan Up" },
    { cameraMove: "crane-down", pose: "Pan Down" },
  ])("sends the move $cameraMove as the Fun Camera pose $pose", async (row) => {
    const { workflow } = await submitted(
      wanCameraBinding(),
      {
        prompt,
        cameraMove: row.cameraMove,
        length: 5,
        startFrame: [startFrameId],
      },
      "1:1"
    )
    expect(workflow["108"]?.inputs).toMatchObject({
      camera_pose: row.pose,
      width: 480,
      height: 480,
      length: 81,
    })
    expect(workflow["107"]?.inputs.text).toBe(prompt)
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends a clip to Fun Control with its edges and its first frame", async () => {
    const { workflow } = await submitted(wanClipBinding(), {
      prompt,
      length: 4,
      clip: [startFrameId],
    })
    expect(workflow["158"]?.inputs.file).toEqual(asset)
    expect(workflow["157"]?.inputs.image).toEqual(["156", 0])
    expect(workflow["160"]?.inputs).toMatchObject({
      control_video: ["157", 0],
      ref_image: ["910", 0],
      length: 65,
    })
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
