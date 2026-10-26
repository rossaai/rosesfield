import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import type { FormValues } from "@/screens/app/app-form"
import {
  hostedBody,
  hostedDefaults,
  hostedProblems,
  missingDefaultsOf,
  shownFormOf,
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
      generateAudio: "on",
      images: [],
    })
  })

  it("starts a shown choice with no default on its auto option, else its first option, so its chip shows a value", () => {
    const quality: ModelField = {
      kind: "choice",
      name: "quality",
      path: "quality",
      required: false,
      options: ["auto", "low", "high"],
      default: null,
    }
    const resolution: ModelField = {
      ...quality,
      name: "resolution",
      path: "resolution",
      options: ["720p", "1080p"],
    }
    const style: ModelField = {
      ...quality,
      name: "style",
      path: "style",
      options: ["a", "b"],
    }
    expect(hostedDefaults([quality, resolution, style], {})).toEqual({
      quality: "auto",
      resolution: "720p",
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
    const season: ModelField = {
      kind: "choice",
      name: "season",
      path: "season",
      required: true,
      options: ["spring", "winter"],
      default: null,
    }
    const problems = hostedProblems([season], valuesWith({ season: undefined }))
    expect(problems.map((problem) => [problem.name, problem.key])).toEqual([
      ["season", "field.choice.required"],
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

  it("sends sound on, no watermark and the standard tier even when the form holds the opposite", () => {
    const hidden: ModelField[] = [
      {
        kind: "toggle",
        name: "generateAudio",
        path: "generate_audio",
        required: false,
        default: false,
      },
      {
        kind: "choice",
        name: "sound",
        path: "sound",
        required: false,
        options: ["on", "off"],
        default: "off",
      },
      {
        kind: "toggle",
        name: "watermark",
        path: "watermark",
        required: false,
        default: true,
      },
      {
        kind: "choice",
        name: "serviceTier",
        path: "service_tier",
        required: false,
        options: ["default", "flex"],
        default: null,
      },
      {
        kind: "choice",
        name: "fps",
        path: "fps",
        required: false,
        options: [24, 25],
        default: 25,
      },
    ]
    const body = hostedBody(
      "maker/clip-3",
      hidden,
      valuesWith({
        generateAudio: "off",
        sound: "off",
        watermark: "on",
        serviceTier: "flex",
        fps: 25,
      }),
      "video"
    )
    expect(body.inputs).toEqual({
      model: "maker/clip-3",
      generateAudio: "on",
      sound: "on",
      watermark: "off",
      serviceTier: "default",
      fps: 25,
    })
    expect(
      hostedProblems(hidden, valuesWith({ serviceTier: undefined }))
    ).toEqual([])
  })

  it("turns a multi-image switch on only when the count asks for more than one", () => {
    const seriesForm: ModelField[] = [
      {
        kind: "choice",
        name: "resultType",
        path: "result_type",
        required: false,
        options: ["single", "series"],
        default: "single",
      },
      {
        kind: "number",
        name: "seriesAmount",
        path: "series_amount",
        required: false,
        min: 2,
        max: 9,
        integer: true,
        default: 4,
      },
    ]
    const shown = shownFormOf(seriesForm)
    expect(shown[1]).toMatchObject({ min: 1, default: 1 })
    const at = (count: number) =>
      hostedBody(
        "maker/image-1",
        shown,
        valuesWith({ resultType: "single", seriesAmount: count }),
        "image"
      ).inputs
    expect(at(3)).toEqual({
      model: "maker/image-1",
      resultType: "series",
      seriesAmount: 3,
    })
    expect(at(1)).toEqual({ model: "maker/image-1", resultType: "single" })
    const sequential: ModelField[] = [
      {
        kind: "choice",
        name: "sequentialImageGeneration",
        path: "sequential_image_generation",
        required: false,
        options: ["auto", "disabled"],
        default: null,
      },
      {
        kind: "number",
        name: "maxImages",
        path: "sequential_image_generation_options.max_images",
        required: false,
        min: 1,
        max: 15,
        integer: true,
        default: null,
      },
    ]
    expect(
      hostedBody(
        "maker/image-2",
        sequential,
        valuesWith({ maxImages: 2 }),
        "image"
      ).inputs
    ).toEqual({
      model: "maker/image-2",
      sequentialImageGeneration: "auto",
      maxImages: 2,
    })
    expect(
      hostedBody(
        "maker/image-2",
        sequential,
        valuesWith({ maxImages: 1, sequentialImageGeneration: "disabled" }),
        "image"
      ).inputs
    ).toEqual({ model: "maker/image-2" })
  })

  it("writes the default of every setting the form does not hold yet, and keeps the ones it holds", () => {
    const resolution: ModelField = {
      kind: "choice",
      name: "resolution",
      path: "resolution",
      required: false,
      options: ["480p", "720p"],
      default: null,
    }
    expect(
      missingDefaultsOf([...fields, resolution], {
        prompt: "a door",
        aspectRatio: "1:1",
      })
    ).toEqual({ duration: 5, generateAudio: "on", resolution: "480p" })
  })
})
