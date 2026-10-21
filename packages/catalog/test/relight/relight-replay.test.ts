import { startRunBodyFor } from "@rosesfield/contract"
import { ComfyGenerationEngine, Run } from "@rosesfield/generation"
import { appIdFormat, runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { sentWords } from "#relight/relight-words"
import {
  brokenLinks,
  cloudUrl,
  definition,
  draft2509Models,
  jobId,
  key,
  loaded,
  photoId,
  promptSent,
  requestFor,
  submitted,
  triggerWord,
  type Workflow,
} from "./relight-requests"

describe("the Relight engine request", () => {
  it("sends the 2509 relight workflow at draft with the light from the left and warm", async () => {
    const { workflow, replay, submission } = await submitted(
      requestFor({ image: [photoId], direction: "left", color: "warm" })
    )
    expect(submission.ref).toBe(jobId)
    expect(submission.models).toEqual(draft2509Models)
    expect(replay.sent.map((sent) => sent.url)).toEqual([
      `${cloudUrl}/api/v2/assets`,
      `${cloudUrl}/api/v2/jobs`,
    ])
    expect(replay.sent[1]?.headers.get("Idempotency-Key")).toBe(key)
    expect(workflow).toMatchObject({
      "1": { class_type: "LoadImage", inputs: { image: loaded } },
      "2": {
        class_type: "ImageScaleToTotalPixels",
        inputs: { image: ["1", 0], megapixels: 1, resolution_steps: 16 },
      },
      "6": {
        inputs: {
          model: ["3", 0],
          lora_name:
            "Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16.safetensors",
          strength_model: 1,
        },
      },
      "7": {
        inputs: {
          model: ["6", 0],
          lora_name: "Qwen-Image-Edit-2509-Relight.safetensors",
          strength_model: 1,
        },
      },
      "8": { inputs: { model: ["7", 0], shift: 3 } },
      "13": { class_type: "RepeatLatentBatch", inputs: { amount: 1 } },
      "14": {
        class_type: "KSampler",
        inputs: {
          seed: 42,
          steps: 4,
          cfg: 1,
          sampler_name: "euler",
          scheduler: "simple",
          positive: ["10", 0],
        },
      },
      "16": { class_type: "SaveImage", inputs: { images: ["15", 0] } },
    })
    expect(promptSent(workflow)).toBe(
      `${triggerWord} ${sentWords({
        direction: "left",
        softness: "auto",
        color: "warm",
        brightness: 0,
        prompt: "",
      })}`
    )
    expect(promptSent(workflow)).toBe(
      `${triggerWord} Relight the photo with light from the left side of the picture. Warm color.`
    )
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("adds the brightness and the description, and makes one output per job at a count of 4", async () => {
    const request = requestFor(
      {
        image: [photoId],
        softness: "hard",
        brightness: -2,
        prompt: "Light from a window at dusk.",
      },
      4,
      43
    )
    expect(request.count).toBe(4)
    const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test" })
    expect(engine.outputsPerJob(request.binding)).toBe("one")
    const { workflow } = await submitted(request)
    expect(workflow["13"]?.inputs.amount).toBe(1)
    expect(workflow["14"]?.inputs.seed).toBe(43)
    expect(promptSent(workflow)).toBe(
      `${triggerWord} Relight the photo. Hard light with sharp shadows. Much dimmer light. Light from a window at dusk.`
    )
  })

  it("gives each job of a run of 4 its own seed, the seed and the next three", () => {
    const run = Run.queue({
      id: runIdFormat.parse(crypto.randomUUID()),
      appId: appIdFormat.parse("relight"),
      request: startRunBodyFor(definition).parse({
        inputs: { image: [photoId] },
        count: 4,
      }),
      seed: 42,
      adapter: "comfy",
      origin: "live",
      idempotencyKey: key,
      now: new Date("2026-10-18T09:00:00Z"),
      outputsPerJob: new ComfyGenerationEngine({
        apiKey: "comfyui-test",
      }).outputsPerJob(requestFor({ image: [photoId] }, 4).binding),
    })
    expect(run.toState().jobs.map((job) => job.seed)).toEqual([42, 43, 44, 45])
  })

  it("asks for a light change and nothing more with every input at its default", async () => {
    const { workflow } = await submitted(requestFor({ image: [photoId] }))
    expect(promptSent(workflow)).toBe(`${triggerWord} Relight the photo.`)
  })

  it("drops the Lightning LoRA at final and samples 40 steps at guidance 4", async () => {
    const { workflow, submission } = await submitted(
      requestFor({ image: [photoId], quality: "final" })
    )
    expect(workflow["6"]).toBeUndefined()
    expect(workflow["7"]?.inputs.model).toEqual(["3", 0])
    expect(workflow["14"]?.inputs).toMatchObject({ steps: 40, cfg: 4 })
    expect(submission.models).toEqual(
      draft2509Models.filter((name) => !name.includes("Lightning"))
    )
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("names a link to a node the workflow does not hold", () => {
    const planted: Workflow = {
      "8": { class_type: "ModelSamplingAuraFlow", inputs: { model: ["7", 0] } },
    }
    expect(brokenLinks(planted)).toEqual(["8.model -> 7"])
  })

  it("reads a planted chain of words the way Comfy joins them", () => {
    const planted: Workflow = {
      "1": {
        class_type: "StringConcatenate",
        inputs: { string_a: "a", string_b: "b ", delimiter: "-" },
      },
      "2": {
        class_type: "RegexReplace",
        inputs: { string: ["1", 0], regex_pattern: "\\s+$", replace: "" },
      },
      "10": {
        class_type: "TextEncodeQwenImageEditPlus",
        inputs: { prompt: ["2", 0] },
      },
    }
    expect(promptSent(planted)).toBe("a-b")
    expect(promptSent(planted)).not.toBe(`${triggerWord} a-b`)
  })
})
