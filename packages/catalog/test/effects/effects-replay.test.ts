import { describe, expect, it } from "vitest"
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
  type Workflow,
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

function nodesOf(workflow: Workflow, from: number, to: number): string[] {
  return Object.keys(workflow).filter(
    (id) => Number(id) >= from && Number(id) <= to
  )
}

function endPrompt(effect: string): string {
  const end = recipeOf(effect).endFrame
  return end.source === "none" ? "" : end.prompt
}

describe("the effects engine request", () => {
  it("draws the pull back end frame from its prompt alone and binds the run to it", async () => {
    const request = requestFor(
      {
        effect: "pull-back-to-space",
        image: [photoId],
        prompt: "a red scarf",
      },
      "9:16"
    )
    const { workflow, replay, ref } = await submitted(request)
    expect(ref).toBe(jobId)
    expect(replay.sent.map((sent) => sent.url)).toEqual([
      `${cloudUrl}/api/v2/assets`,
      `${cloudUrl}/api/v2/jobs`,
    ])
    expect(replay.sent[1]?.headers.get("Idempotency-Key")).toBe(idempotencyKey)
    expect(workflow).toMatchObject({
      "395": { inputs: { image: loadedPhoto } },
      "339": { inputs: { noise_seed: 42 } },
      "532": { inputs: { noise_seed: 42 } },
      "356": { inputs: { width: 352, height: 640, length: 121 } },
      "366": { inputs: { frames_number: 121, frame_rate: 24 } },
      "357": { inputs: { image: ["350", 0], strength: 1 } },
      "349": { inputs: { image: ["350", 0], strength: 1 } },
      "525": { inputs: { image: ["395", 0], megapixels: 1 } },
      "530": { inputs: { width: ["526", 0], height: ["526", 1] } },
      "534": {
        inputs: { model: ["520", 0], positive: ["523", 0], cfg: 1 },
      },
      "460": { inputs: { image: ["536", 0], frame_idx: -1, strength: 0.9 } },
      "463": { inputs: { image: ["536", 0], frame_idx: -1, strength: 0.9 } },
      "388": { inputs: { positive: ["460", 0] } },
    })
    expect(workflow["534"]?.inputs.negative).toEqual(["524", 0])
    for (const id of ["527", "528", "529", "410", "461", "464", "358"]) {
      expect({ id, node: workflow[id] }).toEqual({ id, node: undefined })
    }
    expect(workflow["523"]?.inputs.text).toBe(endPrompt("pull-back-to-space"))
    expect(promptText(workflow, "364").trim()).toBe(
      `${recipeOf("pull-back-to-space").prompt} a red scarf`
    )
    expect(workflow["373"]?.inputs.text).toBe("")
    expect(workflow["370"]?.inputs).not.toHaveProperty("audio")
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("edits the photo into the melt end frame through its reference latent", async () => {
    const request = requestFor({ effect: "melt-away", image: [photoId] }, "3:4")
    const { workflow } = await submitted(request)
    const file = idsOf(fileGraph())
    const gone = ["358", "410", "411", "412", "461", "464"]
    expect(idsOf(workflow)).toEqual(file.filter((id) => !gone.includes(id)))
    expect(workflow).toMatchObject({
      "527": { inputs: { pixels: ["525", 0], vae: ["522", 0] } },
      "528": { inputs: { conditioning: ["523", 0], latent: ["527", 0] } },
      "529": { inputs: { conditioning: ["524", 0], latent: ["527", 0] } },
      "534": { inputs: { positive: ["528", 0], negative: ["529", 0] } },
      "462": { inputs: { positive: ["460", 0], latent: ["367", 0] } },
      "465": { inputs: { positive: ["463", 0] } },
      "356": { inputs: { width: 352, height: 480 } },
    })
    expect(workflow["523"]?.inputs.text).toBe(endPrompt("melt-away"))
    expect(promptText(workflow, "364").trim()).toBe(
      recipeOf("melt-away").prompt
    )
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("holds the subject through the matte in a busy street, with no end frame", async () => {
    const request = requestFor(
      { effect: "still-in-the-street", image: [photoId], resolution: "480p" },
      "16:9"
    )
    const { workflow } = await submitted(request)
    expect(nodesOf(workflow, 520, 536)).toEqual([])
    expect(workflow["460"]).toBeUndefined()
    expect(workflow["463"]).toBeUndefined()
    expect(workflow).toMatchObject({
      "356": { inputs: { width: 448, height: 256, length: 121 } },
      "461": {
        inputs: {
          positive: ["365", 0],
          latent: ["357", 0],
          image: ["350", 0],
          attention_mask: ["412", 0],
          strength: 0.9,
        },
      },
      "464": {
        inputs: {
          positive: ["462", 0],
          latent: ["349", 0],
          attention_mask: ["412", 0],
          strength: 0.9,
        },
      },
      "411": { inputs: { image: ["351", 0] } },
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("keeps only the frame 0 lock and the two-stage render for a prompt-only effect", async () => {
    const request = requestFor(
      { effect: "freeze-and-circle", image: [photoId] },
      "1:1"
    )
    const { workflow } = await submitted(request)
    expect(nodesOf(workflow, 410, 465)).toEqual([])
    expect(nodesOf(workflow, 520, 536)).toEqual([])
    expect(workflow).toMatchObject({
      "377": { inputs: { video_latent: ["357", 0] } },
      "388": { inputs: { model: ["384", 0], positive: ["365", 0] } },
      "348": { inputs: { samples: ["367", 0] } },
      "340": { inputs: { video_latent: ["349", 0] } },
      "374": { inputs: { samples: ["369", 0] } },
      "356": { inputs: { width: 352, height: 352 } },
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends the control with an empty prompt and the fish recipe's hold", async () => {
    const request = requestFor(
      { effect: "control-no-prompt", image: [photoId] },
      "9:16"
    )
    const { workflow } = await submitted(request)
    expect(promptText(workflow, "364").trim()).toBe("")
    expect(workflow["461"]?.inputs.strength).toBe(
      recipeOf("fish-in-the-air").hold
    )
  })

  it("refuses an effect that has no recipe before any request", () => {
    expect(() =>
      requestFor({ effect: "confetti-burst", image: [photoId] }, "1:1")
    ).toThrow()
    expect(() =>
      requestFor({ effect: "living-photo", image: [photoId] }, "1:1")
    ).toThrow()
  })
})
