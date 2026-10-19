import { describe, expect, it } from "vitest"
import { photoInputs } from "#ads/ads-values"
import {
  keepRule,
  kindLeads,
  personRule,
  stylePhrases,
} from "#ads/comfy/ads-prompts"
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
  {
    name: "Klein with 1 photo",
    inputs: { product: [productOne], model: "flux-2-klein-4b" },
  },
  {
    name: "Klein with 2 photos",
    inputs: {
      product: [productOne],
      secondPhoto: [productTwo],
      model: "flux-2-klein-4b",
    },
  },
  {
    name: "Klein with 1 photo and a character",
    inputs: {
      product: [productOne],
      character: [characterId],
      model: "flux-2-klein-4b",
    },
  },
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

  it("sends a FLUX.2 Klein 4B product shot with no scene through one reference chain", async () => {
    const request = requestFor(
      { product: [productOne], model: "flux-2-klein-4b", style: "bold" },
      "9:16"
    )
    const { workflow } = await submitted(request)
    expect(loadNodes(workflow)).toEqual(["76"])
    for (const removed of ["81", "124", "125", "126", "127"]) {
      expect(workflow[removed]).toBeUndefined()
    }
    expect(workflow).toMatchObject({
      "76": { inputs: { image: loaded(productOne) } },
      "62": { inputs: { steps: 4, width: 768, height: 1344 } },
      "66": { inputs: { width: 768, height: 1344, batch_size: 1 } },
      "73": { inputs: { noise_seed: 42 } },
      "63": {
        inputs: { cfg: 1, positive: ["122", 0], negative: ["123", 0] },
      },
    })
    expect(promptOf(workflow, "74", "text")).toBe(
      `${kindLeads["product-shot"]}${stylePhrases.bold} ${keepRule}`
    )
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends a Klein ad with the character in the second reference chain", async () => {
    const request = requestFor(
      {
        kind: "ad",
        headline: "Made to last",
        product: [productOne],
        character: [characterId],
        model: "flux-2-klein-4b",
      },
      "1:1"
    )
    const { workflow } = await submitted(request)
    expect(workflow).toMatchObject({
      "76": { inputs: { image: loaded(productOne) } },
      "81": { inputs: { image: loaded(characterPhoto) } },
      "63": { inputs: { positive: ["126", 0], negative: ["127", 0] } },
    })
    expect(promptOf(workflow, "74", "text")).toBe(
      adPrompt({
        style: "studio",
        headline: "Made to last",
        line: null,
        hasPerson: true,
      })
    )
  })

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
