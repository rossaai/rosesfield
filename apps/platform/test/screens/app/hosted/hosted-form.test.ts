import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import type { FormValues } from "@/screens/app/app-form"
import {
  hostedBody,
  hostedDefaults,
  hostedProblems,
} from "@/screens/app/hosted/hosted-form"

const fields: ModelField[] = [
  {
    kind: "prompt",
    name: "prompt",
    path: "prompt",
    required: true,
    maxLength: 10,
    default: null,
  },
  {
    kind: "choice",
    name: "aspectRatio",
    path: "aspect_ratio",
    required: false,
    options: ["1:1", "16:9"],
    default: "16:9",
  },
  {
    kind: "number",
    name: "duration",
    path: "duration",
    required: false,
    min: 5,
    max: 10,
    integer: true,
    default: 5,
  },
  {
    kind: "toggle",
    name: "generateAudio",
    path: "generate_audio",
    required: false,
    default: false,
  },
  {
    kind: "media",
    name: "images",
    path: "images",
    required: false,
    media: "image",
    min: 1,
    max: 2,
  },
]

function valuesWith(inputs: FormValues["inputs"]): FormValues {
  return { inputs, seedMode: "random", count: 1, aspectRatio: null }
}

describe("a hosted model's form", () => {
  it("starts at the schema's defaults and keeps the prompt you wrote", () => {
    expect(hostedDefaults(fields, { prompt: "a door", style: "x" })).toEqual({
      prompt: "a door",
      aspectRatio: "16:9",
      duration: 5,
      generateAudio: "off",
      images: [],
    })
  })

  it("starts a choice with no default on its auto option, so its chip shows a value", () => {
    const quality: ModelField = {
      kind: "choice",
      name: "quality",
      path: "quality",
      required: false,
      options: ["auto", "low", "high"],
      default: null,
    }
    const style: ModelField = { ...quality, name: "style", options: ["a", "b"] }
    expect(hostedDefaults([quality, style], {})).toEqual({
      quality: "auto",
      style: undefined,
    })
  })

  it("sends the model and every filled field, and leaves out the empty ones", () => {
    const body = hostedBody(
      "maker/clip-3",
      fields,
      valuesWith({
        prompt: "a door",
        aspectRatio: "1:1",
        images: [],
        duration: undefined,
        generateAudio: "on",
      }),
      "video"
    )
    expect(body).toEqual({
      inputs: {
        model: "maker/clip-3",
        prompt: "a door",
        aspectRatio: "1:1",
        generateAudio: "on",
      },
    })
  })

  it("names the field the schema's limits refuse", () => {
    const problems = hostedProblems(
      fields,
      valuesWith({ prompt: "", duration: 11, images: ["a", "b", "c"] })
    )
    expect(problems.map((problem) => [problem.name, problem.key])).toEqual([
      ["prompt", "field.prompt.required"],
      ["duration", "field.number.outOfRange"],
      ["images", "field.asset.tooMany"],
    ])
  })

  it("names a choice you have not set as missing, in words for a choice", () => {
    const mode: ModelField = {
      kind: "choice",
      name: "promptExpansionMode",
      path: "prompt_expansion_mode",
      required: true,
      options: ["balanced", "quality"],
      default: null,
    }
    const problems = hostedProblems(
      [mode],
      valuesWith({ promptExpansionMode: undefined })
    )
    expect(problems.map((problem) => [problem.name, problem.key])).toEqual([
      ["promptExpansionMode", "field.choice.required"],
    ])
  })

  it("names a required text field you left empty by its own caption", () => {
    const voice: ModelField = {
      kind: "text",
      name: "voiceId",
      path: "voice_id",
      required: true,
      maxLength: 64,
      default: null,
    }
    const [problem, ...rest] = hostedProblems(
      [fields[0]!, voice],
      valuesWith({ prompt: "Hello", voiceId: "" })
    )
    expect(rest).toEqual([])
    expect(problem?.name).toBe("voiceId")
    expect(problem?.key).not.toBe("field.prompt.required")
    expect(t(problem!.key, problem!.values)).toBe("Voice id: not set")
  })

  it("control: an empty required prompt still asks for a prompt", () => {
    const problems = hostedProblems(fields, valuesWith({ prompt: "" }))
    expect(problems.map((problem) => [problem.name, problem.key])).toEqual([
      ["prompt", "field.prompt.required"],
    ])
  })

  it("sends a count of several only for a model that makes one at a time", () => {
    const counted: ModelField = {
      kind: "number",
      name: "n",
      path: "n",
      required: false,
      min: 1,
      max: 4,
      integer: true,
      default: 1,
    }
    const values = { ...valuesWith({ prompt: "a door" }), count: 3 }
    expect(hostedBody("maker/clip-3", fields, values, "video").count).toBe(3)
    expect(
      hostedBody("maker/clip-3", [...fields, counted], values, "video").count
    ).toBeUndefined()
  })
})
