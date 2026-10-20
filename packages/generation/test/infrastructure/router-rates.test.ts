import { describe, expect, it } from "vitest"
import type { ModelForm } from "#domain/model-form"
import {
  priceFromRates,
  type RateRow,
} from "#infrastructure/router/router-rates"

const flash: ModelForm = {
  model: "maker/flash-1",
  fields: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
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
  ],
}

const clip: ModelForm = {
  model: "maker/clip-2",
  fields: [
    {
      kind: "choice",
      name: "resolution",
      path: "resolution",
      required: false,
      options: ["720p", "1080p"],
      default: "720p",
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
  ],
}

function row(model: string, conditions: string, unit = "per generation") {
  const one: RateRow = { model, credits: 2, unit, conditions }
  return one
}

describe("priceFromRates", () => {
  it("answers unknown for a row whose condition it cannot read", () => {
    const rows = [
      { ...row(flash.model, "Layer decomposition"), credits: 0.5733 },
    ]
    expect(priceFromRates(rows, flash, { prompt: "a" }, "image")).toBeNull()
  })

  it("reads a row whose condition names the output", () => {
    expect(
      priceFromRates(
        [{ ...row(flash.model, "Image generation"), credits: 0.5733 }],
        flash,
        { prompt: "a" },
        "image"
      )
    ).toBe(0.57)
    const rows = [
      row(clip.model, "Output video; resolution=720p", "per second"),
      {
        ...row(clip.model, "Output video; resolution=1080p", "per second"),
        credits: 4,
      },
    ]
    expect(priceFromRates(rows, clip, { resolution: "1080p" }, "video")).toBe(
      20
    )
    expect(priceFromRates(rows, clip, { resolution: "720p" }, "video")).toBe(10)
  })

  it("changes the price with quality and output size", () => {
    const picture: ModelForm = {
      model: "maker/picture-4",
      fields: [
        {
          kind: "choice",
          name: "quality",
          path: "quality",
          required: false,
          options: ["low", "high"],
          default: null,
        },
        {
          kind: "text",
          name: "size",
          path: "size",
          required: false,
          maxLength: null,
          default: null,
        },
      ],
    }
    const rows = [
      { ...row(picture.model, "Text to image", "per request"), credits: 12.66 },
      {
        ...row(
          picture.model,
          "Text to image; quality=low; output size=1K",
          "per request"
        ),
        credits: 2.11,
      },
      {
        ...row(
          picture.model,
          "Text to image; quality=low; output size=2K",
          "per request"
        ),
        credits: 4.22,
      },
      {
        ...row(
          picture.model,
          "Text to image; quality=high; output size=1K",
          "per request"
        ),
        credits: 46.42,
      },
    ]
    expect(
      priceFromRates(
        rows,
        picture,
        { quality: "low", size: "1024x1024" },
        "image"
      )
    ).toBe(2.11)
    expect(
      priceFromRates(
        rows,
        picture,
        { quality: "high", size: "1024x1024" },
        "image"
      )
    ).toBe(46.42)
    expect(
      priceFromRates(
        rows,
        picture,
        { quality: "low", size: "2048x2048" },
        "image"
      )
    ).toBe(4.22)
    expect(priceFromRates(rows, picture, {}, "image")).toBe(12.66)
    const sized: ModelForm = {
      ...picture,
      fields: picture.fields.map((field) =>
        field.kind === "text" ? { ...field, default: "2048x2048" } : field
      ),
    }
    expect(priceFromRates(rows, sized, { quality: "low" }, "image")).toBe(4.22)
    expect(
      priceFromRates(rows.slice(1), picture, { quality: "low" }, "image")
    ).toBeNull()
  })

  it("prices one job per output on a model that makes one at a time", () => {
    const rows = [{ ...row(flash.model, ""), credits: 0.57 }]
    expect(priceFromRates(rows, flash, { prompt: "a" }, "image", 3)).toBe(1.71)
  })

  it("prices a row when it reads every condition and each one holds", () => {
    const rows = [
      row(clip.model, "720p; 5s", "per second"),
      row(clip.model, "1080p; 5s", "per second"),
    ]
    expect(priceFromRates(rows, clip, { duration: 5 }, "video")).toBe(10)
  })

  it("answers unknown when the run leaves a condition's setting unset", () => {
    const rows = [row(flash.model, "1080p")]
    expect(priceFromRates(rows, flash, { prompt: "a" }, "image")).toBeNull()
  })

  it("prices a row with no condition", () => {
    const rows = [{ ...row(flash.model, ""), credits: 6.33 }]
    expect(priceFromRates(rows, flash, { prompt: "a" }, "image")).toBe(6.33)
  })
})
