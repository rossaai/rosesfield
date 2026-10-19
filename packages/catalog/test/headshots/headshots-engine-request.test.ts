import { describe, expect, it } from "vitest"
import { promptOf } from "#headshots/comfy/headshot-words"
import { seedOf } from "#headshots/headshots-values"
import {
  cloud,
  danglingLinks,
  defaults,
  idempotencyKey,
  promptAt,
  type Recording,
  reachable,
  recordings,
  savedSamplers,
  seedValue,
  submitted,
  uploadedId,
} from "./headshots-replay"

describe("the Headshots engine request on qwen-image-edit-2511", () => {
  it("sends 2 branches with the defaults, 2 seeds and one sentence", async () => {
    const { workflow, submission, sent } = await submitted({})
    const samplers = savedSamplers(workflow)
    expect(samplers).toHaveLength(2)
    expect(samplers.map((one) => seedValue(workflow, one.inputs.seed))).toEqual(
      [4242, 4243]
    )
    expect(samplers.map((one) => promptAt(workflow, one))).toEqual([
      promptOf(defaults),
      promptOf(defaults),
    ])
    expect(samplers[0]?.inputs).toMatchObject({
      steps: 40,
      cfg: 4,
      sampler_name: "euler",
      scheduler: "simple",
      denoise: 1,
    })
    expect(workflow["192"]?.inputs).toMatchObject({
      width: 1024,
      height: 1024,
      batch_size: 1,
    })
    expect(workflow["41"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(workflow["161"]?.inputs.unet_name).toBe(
      "qwen_image_edit_2511_bf16.safetensors"
    )
    expect(submission.models).toEqual([
      "qwen_image_edit_2511_bf16.safetensors",
      "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "qwen_image_vae.safetensors",
    ])
    expect(submission.workflowHash).toMatch(/^[0-9a-f]{64}$/)
    expect(sent.map((one) => `${one.method} ${one.url}`)).toEqual([
      `POST ${cloud}/api/v2/assets`,
      `POST ${cloud}/api/v2/jobs ${idempotencyKey}`,
    ])
    const used = reachable(workflow, "9")
    const sampled = [...used].filter(
      (id) => workflow[id]?.class_type === "KSampler"
    )
    expect(sampled).toHaveLength(2)
    expect(danglingLinks(workflow)).toEqual([])
  })

  it("sends 4 branches in 3:4 with the chosen words and wraps the seeds", async () => {
    const choices = {
      framing: "wide",
      background: "dark",
      clothes: "plain-top",
      keepGlasses: "off",
    } as const
    const seed = 2_147_483_646
    const { workflow } = await submitted(
      { inputs: choices, count: 4, aspectRatio: "3:4" },
      seed
    )
    const samplers = savedSamplers(workflow)
    expect(samplers).toHaveLength(4)
    expect(samplers.map((one) => seedValue(workflow, one.inputs.seed))).toEqual(
      [0, 1, 2, 3].map((index) => seedOf(seed, index))
    )
    expect(new Set(samplers.map((one) => promptAt(workflow, one)))).toEqual(
      new Set([promptOf(choices)])
    )
    expect(promptOf(choices)).toContain("The person wears no glasses.")
    expect(workflow["192"]?.inputs).toMatchObject({ width: 896, height: 1152 })
  })

  it("sends 1 branch for a count of 1 in 4:3", async () => {
    const { workflow } = await submitted({ count: 1, aspectRatio: "4:3" })
    expect(savedSamplers(workflow)).toHaveLength(1)
    expect(workflow["9"]?.inputs.images).toEqual(["1002", 0])
    expect(workflow["192"]?.inputs).toMatchObject({ width: 1152, height: 896 })
  })
})

describe("the controls of the replay", () => {
  it("throws on a request it has no recording for", async () => {
    const withoutUpload: Record<string, Recording> = {}
    const job = recordings[`POST ${cloud}/api/v2/jobs`]
    if (job !== undefined) {
      withoutUpload[`POST ${cloud}/api/v2/jobs`] = job
    }
    await expect(submitted({}, 4242, withoutUpload)).rejects.toThrow(
      expect.objectContaining({ code: "ENGINE_UNAVAILABLE" })
    )
  })

  it("finds a planted dangling link, a planted seed without its offset and a planted fifth output", async () => {
    const { workflow } = await submitted({ count: 4 })
    const dangling = structuredClone(workflow)
    const batch = dangling["902"]
    if (batch === undefined) {
      throw new Error("The run has no first batch node")
    }
    batch.inputs = { ...batch.inputs, image2: ["9999", 0] }
    expect(danglingLinks(dangling)).toEqual(["902 -> 9999"])
    const repeated = structuredClone(workflow)
    const math = repeated["2000"]
    if (math === undefined) {
      throw new Error("The run has no seed node for output 2")
    }
    math.inputs = { ...math.inputs, expression: "a + 0" }
    expect(() =>
      savedSamplers(repeated).map((one) => seedValue(repeated, one.inputs.seed))
    ).toThrow("adds no offset")
    const longer = structuredClone(workflow)
    longer["905"] = {
      class_type: "ImageBatch",
      inputs: { image1: ["904", 0], image2: ["1002", 0] },
    }
    const save = longer["9"]
    if (save === undefined) {
      throw new Error("The run has no save node")
    }
    save.inputs = { ...save.inputs, images: ["905", 0] }
    expect(savedSamplers(longer)).toHaveLength(5)
  })
})
