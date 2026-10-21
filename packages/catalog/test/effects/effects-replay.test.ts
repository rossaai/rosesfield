import { describe, expect, it } from "vitest"
import { ratioOf } from "#effects/comfy/frame-sizes"
import { recipeOf } from "#effects/effect-recipes"
import { findWorkflow } from "#list-workflows"
import {
  brokenLinks,
  cloudUrl,
  idempotencyKey,
  jobId,
  loadedPhoto,
  photoId,
  promptText,
  requestFor,
  submitted,
} from "./effects-replay"

function fileGraph(): Record<string, unknown> {
  const workflow = findWorkflow("effects-ltx-2-5")
  if (workflow === null) {
    throw new Error("workflows/effects-ltx-2-5 is not listed")
  }
  return workflow.graph
}

function idsOf(workflow: Readonly<Record<string, unknown>>): string[] {
  return Object.keys(workflow).sort()
}

function endPrompt(effect: string): string {
  const end = recipeOf(effect).endFrame
  return end.source === "edit" ? end.prompt : ""
}

describe("the effects engine request", () => {
  it("scales the photo, makes the orbit view it opens on and descends to the photo with its sound", async () => {
    const request = requestFor(
      {
        effect: "pull-back-to-space",
        image: [photoId],
        prompt: "a red scarf",
      },
      "9:16"
    )
    const { workflow, replay, ref } = await submitted(request)
    const recipe = recipeOf("pull-back-to-space")
    expect(ref).toBe(jobId)
    expect(replay.sent.map((sent) => sent.url)).toEqual([
      `${cloudUrl}/api/v2/assets`,
      `${cloudUrl}/api/v2/jobs`,
    ])
    expect(replay.sent[1]?.headers.get("Idempotency-Key")).toBe(idempotencyKey)
    expect(workflow).toMatchObject({
      "395": { inputs: { image: loadedPhoto } },
      "606": {
        inputs: { image: ["395", 0], width: 704, height: 1280, crop: "center" },
      },
      "620": { inputs: { image1: ["606", 0] } },
      "625": { inputs: { width: ["624", 0], height: ["624", 1] } },
      "626": { inputs: { seed: 42 } },
      "339": { inputs: { noise_seed: 42 } },
      "351": { inputs: { input: ["627", 0] } },
      "356": { inputs: { width: 352, height: 640, length: 241 } },
      "366": { inputs: { frames_number: 241, frame_rate: 24 } },
      "357": { inputs: { image: ["350", 0], strength: 0.7 } },
      "349": { inputs: { image: ["350", 0], strength: 1 } },
      "460": { inputs: { image: ["606", 0], frame_idx: -1, strength: 0.9 } },
      "463": { inputs: { image: ["606", 0], frame_idx: -1, strength: 0.9 } },
      "380": { inputs: { width: 720, height: 1280, crop: "center" } },
      "370": { inputs: { images: ["380", 0], audio: ["358", 0] } },
    })
    for (const id of ["410", "461", "464"]) {
      expect({ id, node: workflow[id] }).toEqual({ id, node: undefined })
    }
    expect(workflow["620"]?.inputs.prompt).toBe(endPrompt("pull-back-to-space"))
    expect(promptText(workflow, "364").trim()).toBe(
      `${recipe.prompt} a red scarf ${recipe.design.sound?.prompt}`
    )
    expect(workflow["373"]?.inputs.text).toBe("")
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("holds the person whole through the matte while the building bends, with no sound", async () => {
    const request = requestFor(
      { effect: "buildings-ripple", image: [photoId], resolution: "480p" },
      "3:4"
    )
    const { workflow } = await submitted(request)
    const file = idsOf(fileGraph())
    expect(idsOf(workflow)).toEqual(
      file.filter((id) => id !== "358" && id !== "628")
    )
    expect(workflow).toMatchObject({
      "356": { inputs: { width: 256, height: 352, length: 169 } },
      "606": { inputs: { width: 512, height: 704 } },
      "380": { inputs: { width: 554, height: 738 } },
      "411": { inputs: { image: ["351", 0] } },
      "461": {
        inputs: {
          positive: ["460", 0],
          image: ["350", 0],
          attention_mask: ["412", 0],
          strength: 0.9,
        },
      },
      "464": { inputs: { attention_mask: ["412", 0], strength: 0.9 } },
    })
    expect(workflow["370"]?.inputs).not.toHaveProperty("audio")
    expect(workflow["503"]?.inputs.string_b).toBe("")
    expect(promptText(workflow, "364").trim()).toBe(
      recipeOf("buildings-ripple").prompt
    )
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("renders the 15 seconds of the diner look at the 720p area of a square frame", async () => {
    const request = requestFor(
      { effect: "freeze-and-circle", image: [photoId] },
      "1:1"
    )
    const { workflow } = await submitted(request)
    expect(workflow).toMatchObject({
      "356": { inputs: { width: 352, height: 352, length: 361 } },
      "366": { inputs: { frames_number: 361 } },
      "606": { inputs: { width: 704, height: 704 } },
      "380": { inputs: { width: 960, height: 960 } },
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it.each(["480p", "720p"])(
    "gives a 9:16 photo a 9:16 frame at every stage at %s, the photo's own pixels with no redraw",
    async (resolution) => {
      const request = requestFor(
        { effect: "melt-away", image: [photoId], resolution },
        "9:16"
      )
      const { workflow } = await submitted(request)
      const sizeAt = (id: string): number => {
        const inputs = workflow[id]?.inputs
        return Number(inputs?.width) / Number(inputs?.height)
      }
      for (const id of ["606", "356", "380"]) {
        expect({ id, ratio: sizeAt(id) }).toEqual({
          id,
          ratio: expect.closeTo(ratioOf("9:16"), 1),
        })
      }
      expect(workflow["606"]).toMatchObject({
        class_type: "ImageScale",
        inputs: { image: ["395", 0], crop: "center" },
      })
      expect(workflow["351"]?.inputs.input).toEqual(["606", 0])
      for (const id of ["605", "610", "611", "614", "615", "616"]) {
        expect({ id, node: workflow[id] }).toEqual({ id, node: undefined })
      }
      expect(brokenLinks(workflow)).toEqual([])
    }
  )
})
