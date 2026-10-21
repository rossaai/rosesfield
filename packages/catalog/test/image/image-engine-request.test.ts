import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { app } from "#image/app"
import { submitJob } from "./comfy-recordings"
import { ReplayFetch } from "./replay-fetch"

const definition = appDefinition.parse(app)
const key = "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f"

type Body = {
  inputs: Record<string, unknown>
  count?: number
  aspectRatio?: string
}

function requestFor(body: Body, seed: number | null): EngineRequest {
  const parsed = startRunBodyFor(definition).parse(body)
  return {
    idempotencyKey: key,
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs: parsed.inputs,
    files: [],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed,
    outputKind: "image",
  }
}

type Workflow = Record<
  string,
  { class_type: string; inputs: Record<string, unknown> }
>

function isWorkflow(value: unknown): value is Workflow {
  return typeof value === "object" && value !== null
}

function workflowOf(replay: ReplayFetch): Workflow {
  const body = replay.bodyOf("/api/v2/jobs")
  const workflow =
    typeof body === "object" && body !== null && "workflow" in body
      ? body.workflow
      : null
  if (!isWorkflow(workflow)) {
    throw new Error("No workflow was sent")
  }
  return workflow
}

function danglingLinks(workflow: Workflow): string[] {
  return Object.entries(workflow).flatMap(([id, node]) =>
    Object.entries(node.inputs).flatMap(([name, value]) =>
      Array.isArray(value) &&
      typeof value[0] === "string" &&
      !Object.hasOwn(workflow, value[0])
        ? [`${id}.${name} -> ${value[0]}`]
        : []
    )
  )
}

describe("the engine request the Image binding produces", () => {
  it("sends Qwen Image 2512 its listed 9:16 size and 50 steps", async () => {
    const replay = new ReplayFetch([submitJob])
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-test",
      fetch: replay.fetch,
    })
    await engine.submit(
      requestFor(
        {
          inputs: { prompt: "a quiet street", model: "qwen-image-2512" },
          aspectRatio: "9:16",
        },
        7
      )
    )
    const workflow = workflowOf(replay)
    expect(danglingLinks(workflow)).toEqual([])
    expect(workflow).toMatchObject({
      "230": { inputs: { seed: 7, steps: 50, cfg: 4 } },
      "232": { inputs: { width: 928, height: 1664, batch_size: 1 } },
      "227": { inputs: { text: "a quiet street" } },
    })
  })

  it("sends Z-Image Turbo its 8-step workflow at the 1k and the 2k size of 4:3", async () => {
    const sizes = { "1k": [1152, 864], "2k": [2048, 1536] } as const
    for (const [resolution, [width, height]] of Object.entries(sizes)) {
      const replay = new ReplayFetch([submitJob])
      const engine = new ComfyGenerationEngine({
        apiKey: "comfyui-test",
        fetch: replay.fetch,
      })
      const submission = await engine.submit(
        requestFor(
          {
            inputs: {
              prompt: "a field of roses",
              model: "z-image-turbo",
              resolution,
            },
            count: 2,
            aspectRatio: "4:3",
          },
          11
        )
      )
      expect(submission.models).toEqual([
        "z_image_turbo_bf16.safetensors",
        "qwen_3_4b.safetensors",
        "ae.safetensors",
      ])
      const workflow = workflowOf(replay)
      expect(danglingLinks(workflow)).toEqual([])
      expect(workflow, resolution).toMatchObject({
        "3": {
          class_type: "KSampler",
          inputs: { seed: 11, steps: 8, cfg: 1, sampler_name: "res_multistep" },
        },
        "13": {
          class_type: "EmptySD3LatentImage",
          inputs: { width, height, batch_size: 2 },
        },
        "27": {
          class_type: "CLIPTextEncode",
          inputs: { text: "a field of roses" },
        },
      })
      expect(replay.unused()).toEqual([])
    }
  })

  it("opens on Ming Image 0.1 Design and sends it the 1k size of 16:9 on the latent and on the sampling shift, with your prompt as you wrote it", async () => {
    const replay = new ReplayFetch([submitJob])
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-test",
      fetch: replay.fetch,
    })
    const submission = await engine.submit(
      requestFor(
        {
          inputs: { prompt: 'a poster that reads "Open late"' },
          count: 3,
          aspectRatio: "16:9",
        },
        5
      )
    )
    expect(submission.models).toEqual([
      "ming_image_0.1_design_int8_convrot.safetensors",
      "ming_image_0.1_ling_mini_2.0_int8_convrot.safetensors",
      "ming_image_vae_bf16.safetensors",
    ])
    const workflow = workflowOf(replay)
    expect(danglingLinks(workflow)).toEqual([])
    expect(workflow).toMatchObject({
      "26": { class_type: "RandomNoise", inputs: { noise_seed: 5 } },
      "21": { class_type: "BasicScheduler", inputs: { steps: 12 } },
      "41": {
        class_type: "EmptyLatentImage",
        inputs: { width: 1360, height: 768, batch_size: 3 },
      },
      "42": {
        class_type: "ModelSamplingFlux",
        inputs: { width: 1360, height: 768 },
      },
      "40": {
        class_type: "CLIPTextEncode",
        inputs: { text: 'a poster that reads "Open late"' },
      },
      "84": {
        class_type: "SaveImage",
        inputs: { filename_prefix: "rosesfield-image" },
      },
    })
    const classes = Object.values(workflow).map((node) => node.class_type)
    expect(classes).not.toContain("TextGenerate")
    expect(replay.unused()).toEqual([])
  })

  it("throws on a request it holds no recording for, so nothing reaches Comfy", async () => {
    const replay = new ReplayFetch([])
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-test",
      fetch: replay.fetch,
    })
    await expect(
      engine.submit(
        requestFor({ inputs: { prompt: "a door", model: "z-image-turbo" } }, 1)
      )
    ).rejects.toThrow()
    expect(replay.sent).toEqual([])
  })
})
