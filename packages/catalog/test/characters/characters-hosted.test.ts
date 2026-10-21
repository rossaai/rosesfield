import {
  checkModelInputs,
  type ModelField,
  type ModelForm,
} from "@rosesfield/generation/bindings"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { viewsOf } from "#characters/angle-sets"
import { traitPrompt } from "#characters/comfy/traits-prompt"
import {
  anglePromptsOf,
  anglesGapOf,
  type HostedRun,
  hostedRunsOf,
  takesPhotoAndPrompt,
} from "#characters/hosted-runs"

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

function inputsOf(runs: readonly HostedRun[]): HostedRun["inputs"][] {
  return runs.map((run) => run.inputs)
}

const once = { photos: [], count: 1 }

describe("a Characters run on a hosted model", () => {
  it("writes the traits into the model's prompt with the graph's words", () => {
    const [run] = inputsOf(hostedRunsOf(fields, traits, once))
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

  it("makes one run per view of the angle set, each naming its view, with the character's photos up to the model's limit", () => {
    const runs = inputsOf(hostedRunsOf(fields, angles, { photos, count: 4 }))
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
      expect(checkModelInputs(form, modelInputsOf(run)).kind).toBe("valid")
    }
  })

  it("starts no angles run on a model that takes no image or with no photo", () => {
    const textOnly = fields.filter((field) => field.kind !== "media")
    expect(hostedRunsOf(textOnly, angles, { photos, count: 4 })).toEqual([])
    expect(hostedRunsOf(fields, angles, { photos: [], count: 4 })).toEqual([])
  })

  it("starts no run on a model with no prompt, since the traits reach a model only there", () => {
    const noPrompt = fields.filter((field) => field.kind !== "prompt")
    expect(hostedRunsOf(noPrompt, traits, once)).toEqual([])
  })

  it("asks a model that makes one image per call for the count you chose, and a model with its own count through that count", () => {
    const [many] = hostedRunsOf(fields, traits, { photos: [], count: 3 })
    expect(many?.count).toBe(3)
    expect(hostedRunsOf(fields, traits, once)[0]).not.toHaveProperty("count")
    const counted: readonly ModelField[] = [
      ...fields,
      {
        kind: "number",
        name: "num_images",
        path: "num_images",
        required: false,
        min: 1,
        max: 4,
        integer: true,
        default: 1,
      },
    ]
    const [own] = hostedRunsOf(
      counted,
      { ...traits, num_images: 3 },
      { photos: [], count: 3 }
    )
    expect(own).not.toHaveProperty("count")
    expect(own?.inputs.num_images).toBe(3)
  })
})

function modelInputsOf(run: HostedRun["inputs"]): HostedRun["inputs"] {
  const { mode: _, character: __, angleSet: ___, view: ____, ...rest } = run
  return rest
}

describe("the inputs a hosted Characters run sends", () => {
  it("sends the model's own inputs and the app's mode, which the run start keeps as an app-only input", () => {
    const [run] = inputsOf(hostedRunsOf(fields, traits, once))
    expect(run).toBeDefined()
    expect(run?.mode).toBe("traits")
    expect(checkModelInputs(form, modelInputsOf(run ?? {})).kind).toBe("valid")
    expect(Object.keys(run ?? {}).sort()).toEqual(
      ["aspect_ratio", "mode", "model", "prompt", "seed"].sort()
    )
  })

  it("sends the angles mode with each view, so each view shows as an angle view", () => {
    const runs = inputsOf(hostedRunsOf(fields, angles, { photos, count: 4 }))
    expect(runs.map((run) => run.mode)).toEqual([
      "angles",
      "angles",
      "angles",
      "angles",
    ])
    for (const run of runs) {
      expect(checkModelInputs(form, modelInputsOf(run)).kind).toBe("valid")
    }
  })

  it("sends the character and the angle set with each view, so each view offers Add to character and names its view", () => {
    const runs = inputsOf(hostedRunsOf(fields, angles, { photos, count: 4 }))
    expect(runs).toHaveLength(4)
    for (const run of runs) {
      expect(run).toMatchObject({
        mode: "angles",
        character: angles.character,
        angleSet: "quarters",
      })
    }
    const [plain] = inputsOf(
      hostedRunsOf(
        fields,
        { ...angles, angleSet: undefined },
        { photos, count: 4 }
      )
    )
    expect(plain?.angleSet).toBe("turnaround")
  })

  it("sends no character or angle set with a traits run", () => {
    const [run] = inputsOf(
      hostedRunsOf(
        fields,
        { ...traits, character: angles.character, angleSet: "quarters" },
        once
      )
    )
    expect(run).not.toHaveProperty("character")
    expect(run).not.toHaveProperty("angleSet")
  })

  it("sends the app's mode to a model with a mode field of its own, and leaves that field to the model's default", () => {
    const moded: readonly ModelField[] = [
      ...fields,
      {
        kind: "choice",
        name: "mode",
        path: "mode",
        required: false,
        options: ["fast", "slow"],
        default: "fast",
      },
    ]
    const [run] = inputsOf(hostedRunsOf(moded, traits, once))
    expect(run?.mode).toBe("traits")
    const rest = modelInputsOf(run ?? {})
    expect(rest).not.toHaveProperty("mode")
    expect(checkModelInputs({ model, fields: moded }, rest).kind).toBe("valid")
  })

  it("names the view each run of the angle set asks for, in the order of the set", () => {
    const runs = inputsOf(hostedRunsOf(fields, angles, { photos, count: 4 }))
    expect(runs.map((run) => run.view)).toEqual([...viewsOf("quarters")])
    expect(runs.map((run) => run.view)).toEqual([
      "front-right",
      "back-right",
      "back-left",
      "front-left",
    ])
    const [traitsRun] = inputsOf(hostedRunsOf(fields, traits, once))
    expect(traitsRun).not.toHaveProperty("view")
  })

  it("sends at most the model's own number of reference photos, the first photos first", () => {
    const many = [...photos, ...photos.slice(0, 2)]
    const withLimit = (max: number): ModelField[] =>
      fields.map((field) =>
        field.kind === "media" ? { ...field, max } : field
      )
    const sentTo = (max: number) =>
      inputsOf(
        hostedRunsOf(withLimit(max), angles, { photos: many, count: 4 })
      ).map((run) => run.input_images)
    expect(sentTo(2)).toEqual(Array.from({ length: 4 }, () => many.slice(0, 2)))
    expect(sentTo(10)).toEqual(Array.from({ length: 4 }, () => many))
  })
})

describe("what stops a hosted angle set", () => {
  it("names the model when it takes no photo or no prompt, and the character when no photo is in hand", () => {
    const textOnly = fields.filter((field) => field.kind !== "media")
    const noPrompt = fields.filter((field) => field.kind !== "prompt")
    expect(anglesGapOf(textOnly, photos)).toBe("model")
    expect(anglesGapOf(noPrompt, photos)).toBe("model")
    expect(anglesGapOf(fields, [])).toBe("character")
    expect(anglesGapOf(fields, photos)).toBeNull()
  })

  it("reads a model as one that draws the views only when it takes a photo and a prompt", () => {
    expect(takesPhotoAndPrompt(fields)).toBe(true)
    expect(
      takesPhotoAndPrompt(fields.filter((field) => field.kind !== "media"))
    ).toBe(false)
    expect(
      takesPhotoAndPrompt(fields.filter((field) => field.kind !== "prompt"))
    ).toBe(false)
  })
})
