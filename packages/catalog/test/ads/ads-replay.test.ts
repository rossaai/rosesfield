import { Run } from "@rosesfield/generation"
import { appIdFormat, runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { photoInputs } from "#ads/ads-values"
import {
  keepRule,
  kindLeads,
  personRule,
  stylePhrases,
} from "#ads/comfy/ads-prompts"
import { adsRatios, adsSizes } from "#ads/comfy/ads-sizes"
import {
  adPrompt,
  brokenLinks,
  characterId,
  characterPhoto,
  engineWith,
  jobId,
  key,
  loaded,
  loadNodes,
  placeholderImage,
  productOne,
  productThree,
  productTwo,
  promptOf,
  ReplayFetch,
  requestFor,
  submitRecording,
  submitted,
  unfilledLoads,
  type Workflow,
} from "./ads-replay"

const variants: { name: string; inputs: Record<string, unknown> }[] = [
  ...[1, 2, 3].map((count) => ({
    name: `Qwen with ${count} photos`,
    inputs: Object.fromEntries(
      photoInputs.slice(0, count).map((name) => [name, [productOne]])
    ),
  })),
  ...[1, 2].map((count) => ({
    name: `Qwen with ${count} photos and a character`,
    inputs: {
      ...Object.fromEntries(
        photoInputs.slice(0, count).map((name) => [name, [productOne]])
      ),
      character: [characterId],
    },
  })),
]

describe("the Ads engine request", () => {
  it("sends a Qwen Image Edit 2511 product shot with one photo in one slot and the link left out of the prompt", async () => {
    const request = requestFor(
      {
        scene: "on a marble kitchen counter https://shop.example/item/42",
        product: [productOne],
      },
      "16:9"
    )
    const { workflow, replay, ref } = await submitted(request)
    expect(ref).toBe(jobId)
    expect(replay.uploads).toEqual([productOne])
    expect(replay.sent.at(-1)?.headers.get("Idempotency-Key")).toBe(key)
    expect(loadNodes(workflow)).toEqual(["41"])
    expect(workflow).toMatchObject({
      "41": { inputs: { image: loaded(productOne) } },
      "192": { inputs: { width: 1344, height: 768, batch_size: 1 } },
      "169": { inputs: { seed: 42, steps: 40, cfg: 3 } },
      "161": {
        inputs: { unet_name: "qwen_image_edit_2511_fp8mixed.safetensors" },
      },
    })
    for (const encoder of ["149", "151"]) {
      expect(Object.keys(workflow[encoder]?.inputs ?? {}).sort()).toEqual([
        "clip",
        "image1",
        "prompt",
        "vae",
      ])
    }
    expect(promptOf(workflow, "151", "prompt")).toBe(
      `${kindLeads["product-shot"]}${stylePhrases.studio} on a marble kitchen counter. ${keepRule}`
    )
    expect(promptOf(workflow, "149", "prompt")).toBe("")
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends a Qwen ad with 2 photos and a character in 3 slots, the headline and the second line", async () => {
    const request = requestFor(
      {
        kind: "ad",
        headline: "Fresh cold brew",
        line: "Made in small batches every morning",
        product: [productOne],
        secondPhoto: [productTwo],
        character: [characterId],
        style: "minimal",
      },
      "3:4"
    )
    const { workflow, replay } = await submitted(request)
    expect([...replay.uploads].sort()).toEqual(
      [productOne, productTwo, characterPhoto].sort()
    )
    expect(workflow).toMatchObject({
      "41": { inputs: { image: loaded(productOne) } },
      "83": { inputs: { image: loaded(productTwo) } },
      "191": { inputs: { image: loaded(characterPhoto) } },
      "192": { inputs: { width: 864, height: 1152, batch_size: 1 } },
    })
    expect(promptOf(workflow, "151", "prompt")).toBe(
      adPrompt({
        style: "minimal",
        headline: "Fresh cold brew",
        line: "Made in small batches every morning",
        hasPerson: true,
      })
    )
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends a Qwen ad with 3 photos and no second line", async () => {
    const request = requestFor(
      {
        kind: "ad",
        headline: "Fresh cold brew\nevery day",
        product: [productOne],
        secondPhoto: [productTwo],
        thirdPhoto: [productThree],
        style: "bold",
      },
      "1:1"
    )
    const { workflow } = await submitted(request)
    expect(workflow).toMatchObject({
      "41": { inputs: { image: loaded(productOne) } },
      "83": { inputs: { image: loaded(productTwo) } },
      "191": { inputs: { image: loaded(productThree) } },
      "192": { inputs: { width: 1024, height: 1024, batch_size: 1 } },
    })
    expect(promptOf(workflow, "151", "prompt")).toBe(
      adPrompt({
        style: "bold",
        headline: "Fresh cold brew every day",
        line: null,
        hasPerson: false,
      })
    )
  })

  it("puts the character in the second Qwen slot after one photo and drops the third slot", async () => {
    const request = requestFor(
      { product: [productOne], character: [characterId], scene: "on a desk." },
      "4:3"
    )
    const { workflow } = await submitted(request)
    expect(loadNodes(workflow)).toEqual(["41", "83"])
    expect(workflow["83"]?.inputs.image).toEqual(loaded(characterPhoto))
    expect(workflow["151"]?.inputs.image3).toBeUndefined()
    expect(promptOf(workflow, "151", "prompt")).toBe(
      `${kindLeads["product-shot"]}${stylePhrases.studio} on a desk. ${keepRule}${personRule}`
    )
  })

  it("sends a Qwen Image Edit 2511 product shot with one photo and no scene at the 1:1 size", async () => {
    const request = requestFor({ product: [productOne] }, "1:1")
    const { workflow } = await submitted(request)
    expect(loadNodes(workflow)).toEqual(["41"])
    expect(workflow).toMatchObject({
      "41": { inputs: { image: loaded(productOne) } },
      "192": { inputs: { width: 1024, height: 1024, batch_size: 1 } },
    })
    expect(promptOf(workflow, "151", "prompt")).toBe(
      `${kindLeads["product-shot"]}${stylePhrases.studio} ${keepRule}`
    )
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("gives each of 4 images its own job on the seed, the seed plus 1, the seed plus 2 and the seed plus 3", async () => {
    const request = requestFor({ product: [productOne] }, "16:9")
    const engine = engineWith(new ReplayFetch([submitRecording]))
    const run = Run.queue({
      id: runIdFormat.parse("1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e"),
      appId: appIdFormat.parse("ads"),
      request: { inputs: request.inputs, count: 4, aspectRatio: "16:9" },
      seed: 42,
      adapter: engine.key,
      origin: "live",
      idempotencyKey: key,
      now: new Date("2026-10-21T09:00:00Z"),
      outputsPerJob: engine.outputsPerJob(request.binding),
    })
    expect(run.jobs.map((job) => job.seed)).toEqual([42, 43, 44, 45])
    const sent: unknown[] = []
    for (const job of run.jobs) {
      const { workflow } = await submitted({
        ...request,
        seed: job.seed,
        count: 1,
      })
      sent.push({
        seed: workflow["169"]?.inputs.seed,
        batch: workflow["192"]?.inputs.batch_size,
        width: workflow["192"]?.inputs.width,
        height: workflow["192"]?.inputs.height,
      })
    }
    expect(sent).toEqual(
      [42, 43, 44, 45].map((seed) => ({
        seed,
        batch: 1,
        width: 1344,
        height: 768,
      }))
    )
  })

  it.each([...adsRatios])(
    "sizes a %s image within 2 percent of its ratio",
    (ratio) => {
      const [wide, tall] = ratio.split(":").map(Number)
      const { width, height } = adsSizes[ratio]
      const wanted = (wide ?? 0) / (tall ?? 1)
      expect(Math.abs(width / height - wanted) / wanted).toBeLessThanOrEqual(
        0.02
      )
    }
  )

  it.each(variants)(
    "fills every image slot of $name and leaves no link dangling",
    async ({ inputs }) => {
      const request = requestFor(inputs, "1:1")
      const replay = new ReplayFetch([submitRecording])
      expect(engineWith(replay).outputsPerJob(request.binding)).toBe("one")
      const { workflow } = await submitted(request)
      expect(unfilledLoads(workflow)).toEqual([])
      expect(brokenLinks(workflow)).toEqual([])
    }
  )

  it("names a link to a node the workflow does not hold", () => {
    const planted: Workflow = {
      "63": { class_type: "CFGGuider", inputs: { positive: ["126", 0] } },
    }
    expect(brokenLinks(planted)).toEqual(["63.positive -> 126"])
  })

  it("names an image slot the run left on the placeholder", () => {
    const planted: Workflow = {
      "83": { class_type: "LoadImage", inputs: { image: placeholderImage } },
    }
    expect(unfilledLoads(planted)).toEqual(["83"])
  })

  it("throws on a request the replay holds no recording for", async () => {
    const request = requestFor({ product: [productOne] }, "1:1")
    await expect(
      engineWith(new ReplayFetch([])).submit(request)
    ).rejects.toThrow()
  })

  it("refuses a style the app does not list before any request", () => {
    expect(() =>
      requestFor({ product: [productOne], style: "neon" }, "1:1")
    ).toThrow()
  })
})
