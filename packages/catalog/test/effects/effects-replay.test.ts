import { describe, expect, it } from "vitest"
import {
  closingRule,
  effectPrompts,
  openingRule,
} from "#effects/comfy/effect-prompts"
import { adapters, effectRecipes } from "#effects/comfy/effect-recipes"
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

function classesOf(workflow: Readonly<Record<string, unknown>>): string[] {
  return Object.entries(workflow).map(([id, node]) =>
    typeof node === "object" && node !== null && "class_type" in node
      ? `${id}:${String(node.class_type)}`
      : `${id}:?`
  )
}

function fileGraph(): Record<string, unknown> {
  const workflow = findWorkflow("effects-ltx-2-5")
  if (workflow === null) {
    throw new Error("workflows/effects-ltx-2-5 is not listed")
  }
  return workflow.graph
}

function nodesOf(workflow: Workflow, from: number, to: number): string[] {
  return Object.keys(workflow).filter(
    (id) => Number(id) >= from && Number(id) <= to
  )
}

describe("the effects engine request", () => {
  it("sends the rain workflow of workflows/ with every mechanism bound to the run", async () => {
    const request = requestFor(
      {
        effect: "rain",
        image: [photoId],
        prompt: "a red scarf",
        length: 3,
        sound: "on",
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
    expect(classesOf(workflow)).toEqual(classesOf(fileGraph()))
    expect(workflow).toMatchObject({
      "395": { inputs: { image: loadedPhoto } },
      "339": { inputs: { noise_seed: 42 } },
      "439": { inputs: { noise_seed: 42 } },
      "356": { inputs: { width: 352, height: 640, length: 73 } },
      "366": { inputs: { frames_number: 73, frame_rate: 24 } },
      "433": { inputs: { width: 704, height: 1280, length: 9 } },
      "357": { inputs: { image: ["350", 0], strength: 1 } },
      "349": { inputs: { image: ["350", 0], strength: 1 } },
      "430": { inputs: { lora_name: adapters.waterSimulation.file } },
      "432": { inputs: { image: ["350", 0], amount: 9 } },
      "434": { inputs: { image: ["432", 0], iclora_parameters: ["431", 0] } },
      "460": { inputs: { image: ["447", 0], frame_idx: -1, strength: 0.7 } },
      "461": {
        inputs: { image: ["350", 0], frame_idx: -1, strength: 0.5 },
      },
      "464": { inputs: { attention_mask: ["412", 0], strength: 0.5 } },
      "370": { inputs: { audio: ["358", 0], fps: 24 } },
    })
    expect(workflow["461"]?.inputs.attention_mask).toEqual(["412", 0])
    expect(promptText(workflow, "364")).toBe(
      `${openingRule} ${effectPrompts.rain} a red scarf ${effectRecipes.rain.soundLine} ${closingRule}`
    )
    expect(workflow["435"]?.inputs.text).toMatch(/^ADD WATER\. Heavy rain/)
    expect(workflow["373"]?.inputs.text).toBe("")
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("holds the subject through the matte for confetti, with no end frame and no sound", async () => {
    const request = requestFor(
      { effect: "confetti-burst", image: [photoId] },
      "16:9"
    )
    const { workflow } = await submitted(request)
    expect(nodesOf(workflow, 430, 447)).toEqual([])
    expect(workflow["460"]).toBeUndefined()
    expect(workflow["463"]).toBeUndefined()
    expect(workflow).toMatchObject({
      "356": { inputs: { width: 640, height: 352, length: 121 } },
      "461": {
        inputs: {
          positive: ["365", 0],
          latent: ["357", 0],
          attention_mask: ["412", 0],
          strength: 0.6,
        },
      },
      "464": { inputs: { positive: ["462", 0], latent: ["349", 0] } },
      "411": { inputs: { image: ["351", 0] } },
    })
    expect(workflow["358"]).toBeUndefined()
    expect(workflow["370"]?.inputs).not.toHaveProperty("audio")
    expect(promptText(workflow, "364")).toBe(
      `${openingRule} ${effectPrompts["confetti-burst"]} ${closingRule}`
    )
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("runs a living photo on the Cinemagraph adapter and refuses sound for it", async () => {
    expect(() =>
      requestFor(
        { effect: "living-photo", image: [photoId], sound: "on" },
        "1:1"
      )
    ).toThrow(/sound applies only when effect is/)
    const request = requestFor(
      { effect: "living-photo", image: [photoId], resolution: "480p" },
      "1:1"
    )
    const { workflow } = await submitted(request)
    expect(workflow).toMatchObject({
      "420": {
        class_type: "LoraLoaderModelOnly",
        inputs: { model: ["384", 0], lora_name: adapters.cinemagraph.file },
      },
      "388": { inputs: { model: ["420", 0], positive: ["365", 0] } },
      "391": { inputs: { model: ["420", 0] } },
      "348": { inputs: { samples: ["367", 0] } },
      "374": { inputs: { samples: ["369", 0] } },
      "356": { inputs: { width: 256, height: 256 } },
    })
    expect(nodesOf(workflow, 410, 465).sort()).toEqual(["420"])
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("refuses an effect that moved to the reserve list before any request", () => {
    expect(() =>
      requestFor({ effect: "light-sweep", image: [photoId] }, "1:1")
    ).toThrow()
    expect(() =>
      requestFor({ effect: "water-ripple", image: [photoId] }, "1:1")
    ).toThrow()
  })
})
