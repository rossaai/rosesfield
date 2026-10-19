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
    const rows = [{ ...row(flash.model, "Image generation"), credits: 0.5733 }]
    expect(priceFromRates(rows, flash, { prompt: "a" })).toBeNull()
  })

  it("prices a row when it reads every condition and each one holds", () => {
    const rows = [
      row(clip.model, "720p; 5s", "per second"),
      row(clip.model, "1080p; 5s", "per second"),
    ]
    expect(priceFromRates(rows, clip, { duration: 5 })).toBe(10)
  })

  it("answers unknown when the run leaves a condition's setting unset", () => {
    const rows = [row(flash.model, "1080p")]
    expect(priceFromRates(rows, flash, { prompt: "a" })).toBeNull()
  })

  it("prices a row with no condition", () => {
    const rows = [{ ...row(flash.model, ""), credits: 6.33 }]
    expect(priceFromRates(rows, flash, { prompt: "a" })).toBe(6.33)
  })
})
