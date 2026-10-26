import { describe, expect, it } from "vitest"
import type { ModelField, ModelForm } from "#domain/model-form"
import {
  priceFromRates,
  type RateRow,
} from "#infrastructure/router/router-rates"

const prompt: ModelField = {
  kind: "prompt",
  name: "prompt",
  path: "prompt",
  required: true,
  maxLength: null,
  default: null,
}

function choice(
  name: string,
  options: readonly string[],
  fallback: string | null = null
): ModelField {
  return {
    kind: "choice",
    name,
    path: name,
    required: false,
    options,
    default: fallback,
  }
}

function seconds(fallback: number | null, min = 4, max = 8): ModelField {
  return {
    kind: "number",
    name: "duration",
    path: "duration",
    required: false,
    min,
    max,
    integer: true,
    default: fallback,
  }
}

function formOf(model: string, fields: readonly ModelField[]): ModelForm {
  return { model, fields: [prompt, ...fields] }
}

function rowOf(
  model: string,
  credits: number,
  unit: string,
  conditions = ""
): RateRow {
  return { model, credits, unit, conditions }
}

function rangeOf(
  rows: readonly RateRow[],
  form: ModelForm,
  inputs: Record<string, string | number>,
  output = "video"
) {
  const price = priceFromRates(rows, form, { prompt: "a", ...inputs }, output)
  return price === null
    ? null
    : {
        low: price.low ?? price.credits,
        high: price.credits,
        exact: price.exact,
      }
}

describe("each unit of the rate card, converted to credits", () => {
  it("reads per minute as the run's seconds over sixty", () => {
    const form = formOf("maker/sound-1", [seconds(30, 1, 60)])
    const rows = [rowOf(form.model, 29.54, "per minute", "Sound duration")]
    expect(rangeOf(rows, form, {}, "audio")).toEqual({
      low: 14.77,
      high: 14.77,
      exact: true,
    })
  })

  it("reads per 5 seconds rounded up", () => {
    const form = formOf("maker/upscale-1", [seconds(7)])
    const rows = [rowOf(form.model, 12.66, "per 5 seconds")]
    expect(rangeOf(rows, form, {})?.high).toBe(25.32)
  })

  it("reads per 30 output frames rounded up from the seconds and the frame rate", () => {
    const form = formOf("maker/frames-1", [
      seconds(5),
      choice("fps", ["24", "30"], "24"),
    ])
    const rows = [rowOf(form.model, 3, "per 30 output frames, rounded up")]
    expect(rangeOf(rows, form, {})?.high).toBe(12)
    expect(rangeOf(rows, form, { fps: "30" })?.high).toBe(15)
  })

  it("reads per 1M output image tokens from the tokens one image costs at its size", () => {
    const form = formOf("vertexai/gemini-nano-banana-2.1", [
      choice("resolution", ["1K", "2K", "4K"], "1K"),
    ])
    const rows = [
      rowOf(form.model, 6330, "per 1M tokens", "Output image tokens"),
      rowOf(form.model, 63.3, "per 1M tokens", "Input text tokens"),
    ]
    expect(rangeOf(rows, form, {}, "image")).toEqual({
      low: 7.09,
      high: 7.09,
      exact: false,
    })
    expect(rangeOf(rows, form, { resolution: "4K" }, "image")?.high).toBe(23.93)
  })

  it("reads per 1M output image tokens by quality and shape, as a range while the quality is open", () => {
    const form = formOf("openai/gpt-image-1", [
      choice("quality", ["low", "medium", "high"]),
      choice("size", ["1024x1024", "1536x1024"], "1024x1024"),
    ])
    const rows = [
      rowOf(form.model, 8440, "per 1M tokens", "Output image tokens"),
    ]
    expect(rangeOf(rows, form, { quality: "high" }, "image")?.high).toBe(35.11)
    expect(rangeOf(rows, form, {}, "image")).toEqual({
      low: 2.3,
      high: 35.11,
      exact: false,
    })
  })

  it("reads per Recraft credit from the Recraft credits one image costs", () => {
    const form = formOf("recraft/recraftv3", [])
    const rows = [rowOf(form.model, 0.3017, "per Recraft credit")]
    expect(rangeOf(rows, form, {}, "image")).toEqual({
      low: 12.07,
      high: 12.07,
      exact: true,
    })
  })
})

describe("the settings the run leaves unset", () => {
  it("fills every value of a choice with no default and gives the range of its rows", () => {
    const form = formOf("maker/clip-3", [
      choice("resolution", ["720p", "1080p"]),
      seconds(5),
    ])
    const rows = [
      rowOf(form.model, 2, "per second", "resolution=720p"),
      rowOf(form.model, 4, "per second", "resolution=1080p"),
    ]
    expect(rangeOf(rows, form, {})).toEqual({ low: 10, high: 20, exact: false })
    expect(rangeOf(rows, form, { resolution: "1080p" })).toEqual({
      low: 20,
      high: 20,
      exact: true,
    })
  })

  it("fills a length with no default from its limits", () => {
    const form = formOf("maker/clip-4", [seconds(null, 4, 8)])
    const rows = [rowOf(form.model, 3, "per second", "Output video duration")]
    expect(rangeOf(rows, form, {})).toEqual({ low: 12, high: 24, exact: false })
  })

  it("prices exactly when every filled value gives the same row", () => {
    const form = formOf("maker/clip-5", [choice("style", ["calm", "wild"])])
    const rows = [rowOf(form.model, 9, "per generation", "Video generation")]
    expect(rangeOf(rows, form, {})).toEqual({ low: 9, high: 9, exact: true })
  })
})

describe("a setting the card names by another word", () => {
  it("reads the card's quality from the form's rendering speed", () => {
    const form = formOf("ideogram/ideogram-v4", [
      {
        ...choice("renderingSpeed", ["TURBO", "DEFAULT", "QUALITY"], "DEFAULT"),
        path: "rendering_speed",
      },
    ])
    const rows = [
      rowOf(form.model, 9.05, "per request", "quality=TURBO"),
      rowOf(form.model, 18.1, "per request", "quality=DEFAULT"),
      rowOf(form.model, 30.17, "per request", "quality=QUALITY"),
    ]
    expect(rangeOf(rows, form, {}, "image")).toEqual({
      low: 18.1,
      high: 18.1,
      exact: true,
    })
    expect(
      rangeOf(rows, form, { renderingSpeed: "QUALITY" }, "image")?.high
    ).toBe(30.17)
  })
})
