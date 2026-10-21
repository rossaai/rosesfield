import {
  checkModelInputs,
  type ModelField,
  type ModelForm,
} from "@rosesfield/generation/bindings"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { traitPrompt } from "#characters/comfy/traits-prompt"
import { anglePromptsOf, hostedRunsOf } from "#characters/hosted-runs"

const model = "bfl/flux-3-image"

const photos = [
  "0b6f4f1e-3c2a-4d5e-8f70-1a2b3c4d5e6f",
  "1c7a5b2f-4d3b-4e6f-9a81-2b3c4d5e6f70",
  "2d8b6c3a-5e4c-4f70-8b92-3c4d5e6f7081",
  "3e9c7d4b-6f5d-4a81-9ca3-4d5e6f708192",
].map((id) => assetIdFormat.parse(id))

const fields: readonly ModelField[] = [
  {
    kind: "prompt",
    name: "prompt",
    path: "prompt",
    required: true,
    maxLength: 4000,
    default: null,
  },
  {
    kind: "choice",
    name: "aspect_ratio",
    path: "aspect_ratio",
    required: false,
    options: ["1:1", "3:4", "9:16"],
    default: "1:1",
  },
  {
    kind: "number",
    name: "seed",
    path: "seed",
    required: false,
    min: 0,
    max: 2_147_483_647,
    integer: true,
    default: null,
  },
  {
    kind: "media",
    name: "input_images",
    path: "input_images",
    required: false,
    media: "image",
    min: 0,
    max: 3,
  },
]

const form: ModelForm = { model, fields }

const traits = {
  mode: "traits",
  model,
  count: "3",
  gender: "woman",
  age: "middle-aged",
  hairLength: "long",
  hairStyle: "wavy",
  hairColor: "red",
  framing: "portrait",
  details: "round glasses",
  plainBackground: "on",
  aspect_ratio: "3:4",
  seed: 42,
}

const angles = {
  mode: "angles",
  model,
  character: ["5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"],
  angleSet: "quarters",
  aspect_ratio: "1:1",
}

describe("a Characters run on a hosted model", () => {
  it("writes the traits into the model's prompt with the graph's words", () => {
    const [run] = hostedRunsOf(fields, traits, [])
    expect(run?.prompt).toBe(
      "Head and shoulders portrait photograph of one person, a woman, middle-aged, in their fifties, long hair, wavy hair, red hair, in front of a plain light grey studio background, neutral expression, looking straight at the camera, front view, soft even light, sharp focus. round glasses"
    )
    expect(run).toMatchObject({ model, aspect_ratio: "3:4", seed: 42 })
  })

  it("adds no words for a trait left on auto and drops the hair of a bald head", () => {
    expect(traitPrompt({})).toBe(
      "Half-body photograph of one person, framed from the waist up, in front of a plain light grey studio background, neutral expression, looking straight at the camera, front view, soft even light, sharp focus"
    )
    const bald = traitPrompt({
      hairLength: "bald",
      hairStyle: "curly",
      hairColor: "blond",
    })
    expect(bald).toContain(", a bald head")
    expect(bald).not.toContain("curly")
    expect(bald).not.toContain("blond")
  })

  it("sends only the model's own inputs, so the model takes every one", () => {
    const [run] = hostedRunsOf(fields, traits, [])
    expect(run).toBeDefined()
    expect(checkModelInputs(form, run ?? {}).kind).toBe("valid")
    expect(Object.keys(run ?? {}).sort()).toEqual(
      ["aspect_ratio", "model", "prompt", "seed"].sort()
    )
  })

  it("makes one run per view of the angle set, each naming its view, with the character's photos up to the model's limit", () => {
    const runs = hostedRunsOf(fields, angles, photos)
    expect(runs).toHaveLength(4)
    expect(runs.map((run) => run.prompt)).toEqual(anglePromptsOf("quarters"))
    expect(runs.map((run) => run.prompt)).toEqual([
      expect.stringContaining("front-right quarter view"),
      expect.stringContaining("back-right quarter view"),
      expect.stringContaining("back-left quarter view"),
      expect.stringContaining("front-left quarter view"),
    ])
    for (const run of runs) {
      expect(run.input_images).toEqual(photos.slice(0, 3))
      expect(checkModelInputs(form, run).kind).toBe("valid")
    }
  })

  it("starts no angles run on a model that takes no image or with no photo", () => {
    const textOnly = fields.filter((field) => field.kind !== "media")
    expect(hostedRunsOf(textOnly, angles, photos)).toEqual([])
    expect(hostedRunsOf(fields, angles, [])).toEqual([])
  })

  it("starts no run on a model with no prompt, since the traits reach a model only there", () => {
    const noPrompt = fields.filter((field) => field.kind !== "prompt")
    expect(hostedRunsOf(noPrompt, traits, [])).toEqual([])
  })
})
