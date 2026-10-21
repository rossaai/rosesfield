import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  type EngineRequest,
  hostedModelOf,
  resolveBinding,
} from "@rosesfield/generation"
import type { HostedModel } from "@rosesfield/generation/bindings"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { listWorkflows } from "#list-workflows"
import { app } from "#upscale/app"
import { withoutVideoStills } from "../workflows/video-stills"
import {
  brokenLinks,
  classesOf,
  cloudUrl,
  jobId,
  ReplayFetch,
  submitRecording,
  uploadedId,
  uploadRecording,
  type Workflow,
  workflowClassesOf,
} from "./upscale-replay"

const definition = appDefinition.parse(app)
const photoId = assetIdFormat.parse("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d")
const clipId = assetIdFormat.parse("2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e")
const key = "7c6b5a4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d"

const photoFile: EngineFile = {
  assetId: photoId,
  kind: "image",
  mime: "image/png",
  bytes: Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13),
}

const clipFile: EngineFile = {
  assetId: clipId,
  kind: "video",
  mime: "video/mp4",
  bytes: Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73),
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

function requestFor(inputs: Record<string, unknown>): EngineRequest {
  const parsed = startRunBodyFor(definition).parse({ inputs })
  const isVideo = parsed.inputs.mode === "video"
  return {
    idempotencyKey: key,
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs: parsed.inputs,
    files: [isVideo ? clipFile : photoFile],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 42,
    outputKind: isVideo ? "video" : "image",
  }
}

type Submitted = {
  workflow: Workflow
  replay: ReplayFetch
  ref: string
  models: readonly string[]
}

async function submitted(request: EngineRequest): Promise<Submitted> {
  const isVideo = request.outputKind === "video"
  const replay = new ReplayFetch([
    isVideo
      ? uploadRecording("video/mp4", "clip.mp4")
      : uploadRecording("image/png", "photo.png"),
    submitRecording,
  ])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(request)
  const job = replay.sent.find((sent) => sent.url === `${cloudUrl}/api/v2/jobs`)
  const { workflow } = sentBody.parse(JSON.parse(job?.body ?? "{}"))
  return {
    workflow: withoutVideoStills(workflow),
    replay,
    ref: submission.ref,
    models: submission.models,
  }
}

const seedvr2Vae = "seedvr2_ema_vae_fp16.safetensors"
const seedvr2Files = {
  "seedvr2-3b": "seedvr2_3b_int8_convrot.safetensors",
  "seedvr2-7b": "seedvr2_7b_int8_convrot.safetensors",
}

const requests = [
  {
    mode: "image",
    model: "seedvr2-3b",
    workflow: "upscale-image-seedvr2",
    models: [seedvr2Files["seedvr2-3b"], seedvr2Vae],
  },
  {
    mode: "image",
    model: "seedvr2-7b",
    workflow: "upscale-image-seedvr2",
    models: [seedvr2Files["seedvr2-7b"], seedvr2Vae],
  },
  {
    mode: "video",
    model: "seedvr2-3b",
    workflow: "upscale-video-seedvr2",
    models: [seedvr2Files["seedvr2-3b"], seedvr2Vae],
  },
  {
    mode: "video",
    model: "seedvr2-7b",
    workflow: "upscale-video-seedvr2",
    models: [seedvr2Files["seedvr2-7b"], seedvr2Vae],
  },
] as const

function filledFor(mode: "image" | "video"): Record<string, unknown> {
  return mode === "image" ? { image: [photoId] } : { video: [clipId] }
}

const loaded = { __type: "core/ASSET", info: { id: uploadedId } }

describe("each Upscale engine request", () => {
  it.each(requests)(
    "sends $workflow from workflows/ for $model on $mode with one upload and the run's key",
    async ({ mode, model, workflow: id, models }) => {
      const {
        workflow,
        replay,
        models: recorded,
      } = await submitted(requestFor({ mode, model, ...filledFor(mode) }))
      expect(replay.sent.map((sent) => sent.url)).toEqual([
        `${cloudUrl}/api/v2/assets`,
        `${cloudUrl}/api/v2/jobs`,
      ])
      expect(replay.sent[1]?.headers.get("Idempotency-Key")).toBe(key)
      expect(classesOf(workflow)).toEqual(workflowClassesOf(id))
      expect(JSON.stringify(workflow)).toContain(JSON.stringify(loaded))
      expect(recorded).toEqual(models)
      expect(brokenLinks(workflow)).toEqual([])
    }
  )
})

describe("the Upscale engine request", () => {
  it("sends the SeedVR2 3B image workflow at 2x with the seed and the alpha join", async () => {
    const { workflow, replay, ref } = await submitted(
      requestFor({ mode: "image", image: [photoId] })
    )
    expect(ref).toBe(jobId)
    expect(replay.sent.map((sent) => sent.url)).toEqual([
      `${cloudUrl}/api/v2/assets`,
      `${cloudUrl}/api/v2/jobs`,
    ])
    expect(replay.sent[1]?.headers.get("Idempotency-Key")).toBe(key)
    expect(workflow).toMatchObject({
      "1": { class_type: "LoadImage", inputs: { image: loaded } },
      "50": { inputs: { image: ["1", 0], alpha: ["1", 1] } },
      "57": {
        inputs: {
          input: ["50", 0],
          resize_type: "scale by multiplier",
          "resize_type.multiplier": 2,
          scale_method: "lanczos",
        },
      },
      "52": { inputs: { unet_name: "seedvr2_3b_int8_convrot.safetensors" } },
      "51": { inputs: { vae_name: "seedvr2_ema_vae_fp16.safetensors" } },
      "54": { inputs: { seed: 42, steps: 1, cfg: 1 } },
      "59": {
        inputs: {
          images: ["55", 0],
          original_resized_images: ["57", 0],
          color_correction_method: "none",
        },
      },
      "9": { class_type: "SaveImage", inputs: { images: ["59", 0] } },
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends the 7B checkpoint at 4x through the same image workflow", async () => {
    const { workflow } = await submitted(
      requestFor({
        mode: "image",
        image: [photoId],
        scale: "4x",
        model: "seedvr2-7b",
      })
    )
    expect(workflow["52"]?.inputs.unet_name).toBe(
      "seedvr2_7b_int8_convrot.safetensors"
    )
    expect(workflow["57"]?.inputs["resize_type.multiplier"]).toBe(4)
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends the SeedVR2 video workflow and carries the sound and frame rate onto the output", async () => {
    const { workflow } = await submitted(
      requestFor({ mode: "video", video: [clipId], scale: "2x" })
    )
    expect(workflow).toMatchObject({
      "1": { class_type: "LoadVideo", inputs: { file: loaded } },
      "115": { class_type: "GetVideoComponents", inputs: { video: ["1", 0] } },
      "111": { inputs: { input: ["115", 0], "resize_type.multiplier": 2 } },
      "108": { inputs: { unet_name: "seedvr2_3b_int8_convrot.safetensors" } },
      "109": { inputs: { seed: 42 } },
      "113": {
        class_type: "SeedVR2PostProcessing",
        inputs: { images: ["110", 0], original_resized_images: ["111", 0] },
      },
      "116": {
        class_type: "CreateVideo",
        inputs: {
          images: ["113", 0],
          audio: ["115", 1],
          fps: ["115", 2],
        },
      },
      "130": {
        class_type: "SaveVideo",
        inputs: { video: ["116", 0], format: "mp4" },
      },
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("names a link to a node the workflow does not hold", () => {
    const planted: Workflow = {
      "116": { class_type: "CreateVideo", inputs: { audio: ["115", 1] } },
    }
    expect(brokenLinks(planted)).toEqual(["116.audio -> 115"])
  })

  it("refuses the Real-ESRGAN model before any request", () => {
    expect(() =>
      requestFor({ mode: "image", image: [photoId], model: "real-esrgan-4x" })
    ).toThrow()
    expect(() =>
      requestFor({ mode: "video", video: [clipId], model: "real-esrgan-4x" })
    ).toThrow()
  })

  it("refuses a model the app does not list before any request", () => {
    expect(() =>
      requestFor({ mode: "image", image: [photoId], model: "sharp-7b" })
    ).toThrow()
  })

  it("refuses a run with no file for its mode before any request", () => {
    expect(() => requestFor({ mode: "image" })).toThrow("image is required")
    expect(() => requestFor({ mode: "video", image: [photoId] })).toThrow(
      "video is required"
    )
  })

  it("refuses the other mode's file before any request", () => {
    expect(() =>
      requestFor({ mode: "image", image: [photoId], video: [clipId] })
    ).toThrow("video applies only when mode is video")
  })
})

function hosted(
  id: string,
  takes: readonly string[],
  makes: readonly string[]
): HostedModel {
  return { id, provider: id.split("/")[0] ?? "", takes, makes, form: null }
}

describe("the Upscale app's models", () => {
  it("lists the two SeedVR2 graphs, no Real-ESRGAN graph, and opens on the SeedVR2 3B graph", () => {
    expect(appTasksOf(definition)).toEqual(["upscale"])
    expect(defaultModelOf(definition)).toBe("seedvr2-3b")
    const graphs = modelsForApp(definition, [])
    expect(graphs.map((model) => [model.id, model.kind])).toEqual([
      ["seedvr2-3b", "graph"],
      ["seedvr2-7b", "graph"],
    ])
    expect(JSON.stringify(definition.inputs)).not.toMatch(/esrgan/i)
    const ids = listWorkflows().map((workflow) => workflow.id)
    expect(ids).toEqual(
      expect.arrayContaining(["upscale-image-seedvr2", "upscale-video-seedvr2"])
    )
    expect(ids.filter((id) => /esrgan/i.test(id))).toEqual([])
  })

  it("runs the SeedVR2 3B graph on each tab when a run names no model", () => {
    for (const mode of ["image", "video"] as const) {
      const parsed = startRunBodyFor(definition).parse({
        inputs: { mode, ...filledFor(mode) },
      })
      expect(parsed.inputs.model).toBe("seedvr2-3b")
      const ran = resolveBinding(definition.engine, parsed.inputs)
      expect(hostedModelOf(ran)).toBeNull()
      expect(ran.config.models).toEqual([
        seedvr2Files["seedvr2-3b"],
        seedvr2Vae,
      ])
    }
  })

  it("lists the catalog's upscale models after the graphs, open weights before closed ones, and leaves out the rest", () => {
    const listed = modelsForApp(definition, [
      hosted("wavespeed/seedvr2", ["image"], ["image"]),
      hosted("bfl/video-upscale-v1", ["video"], ["video"]),
      hosted("maker/picture", ["text"], ["image"]),
    ])
    expect(listed.map((model) => [model.id, model.kind, model.task])).toEqual([
      ["seedvr2-3b", "graph", "upscale"],
      ["seedvr2-7b", "graph", "upscale"],
      ["wavespeed/seedvr2", "hosted", "upscale"],
      ["bfl/video-upscale-v1", "hosted", "upscale"],
    ])
  })
})
