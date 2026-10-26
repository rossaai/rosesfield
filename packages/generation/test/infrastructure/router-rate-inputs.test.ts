import { type AssetId, assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { ModelForm } from "#domain/model-form"
import {
  priceFromRates,
  type RateRow,
} from "#infrastructure/router/router-rates"

function exactOf(...args: Parameters<typeof priceFromRates>): number | null {
  const price = priceFromRates(...args)
  return price === null || !price.exact ? null : price.credits
}

function rangeOf(
  ...args: Parameters<typeof priceFromRates>
): [number, number] | null {
  const price = priceFromRates(...args)
  return price === null ? null : [price.low ?? price.credits, price.credits]
}

function row(model: string, conditions: string, unit = "per generation") {
  const one: RateRow = { model, credits: 2, unit, conditions }
  return one
}

const edit: ModelForm = {
  model: "maker/edit-1",
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
      name: "resolution",
      path: "resolution",
      required: false,
      options: ["1K", "2K"],
      default: null,
    },
    {
      kind: "media",
      name: "images",
      path: "images",
      required: false,
      media: "image",
      min: 0,
      max: 10,
    },
  ],
}

function imagesOf(count: number): AssetId[] {
  return Array.from({ length: count }, () =>
    assetIdFormat.parse(crypto.randomUUID())
  )
}

describe("the rows a rate card bills per input image", () => {
  const base = { model: edit.model, unit: "per output image", credits: 10 }

  it.each([
    ["Each supplied reference image", "per reference image", 3, 11.5],
    ["Input image; input_tier=one_k", "per input image", 3, 11.5],
    ["Additional input image after the first", "per input image", 3, 11],
    [
      "Reference images after the first five",
      "per additional reference image",
      7,
      11,
    ],
    [
      "Reference images after the first five",
      "per additional reference image",
      4,
      10,
    ],
  ])("adds %s, a row %s, for %i images", (conditions, unit, count, credits) => {
    const rows: RateRow[] = [
      { ...base, conditions: "Output image" },
      { model: edit.model, unit, credits: 0.5, conditions },
    ]
    const inputs = { prompt: "a", resolution: "1K", images: imagesOf(count) }
    expect(exactOf(rows, edit, inputs, "image")).toBe(credits)
  })

  it("adds nothing for a run with no image, and keeps the price exact", () => {
    const rows: RateRow[] = [
      { ...base, conditions: "Output image" },
      {
        model: edit.model,
        unit: "per reference image",
        credits: 0.5,
        conditions: "Each supplied reference image",
      },
    ]
    expect(
      exactOf(rows, edit, { prompt: "a", resolution: "1K" }, "image")
    ).toBe(10)
  })

  it("reads the per-input row of the run's resolution, and the range while the resolution is open", () => {
    const rows: RateRow[] = [
      { ...base, unit: "per generation", conditions: "resolution=1K" },
      {
        ...base,
        unit: "per generation",
        credits: 18,
        conditions: "resolution=2K",
      },
      {
        model: edit.model,
        unit: "per reference image",
        credits: 6,
        conditions: "Each supplied reference image; resolution=1K",
      },
      {
        model: edit.model,
        unit: "per reference image",
        credits: 21,
        conditions: "Each supplied reference image; resolution=2K",
      },
    ]
    const images = imagesOf(2)
    expect(
      exactOf(rows, edit, { prompt: "a", resolution: "2K", images }, "image")
    ).toBe(60)
    expect(rangeOf(rows, edit, { prompt: "a", images }, "image")).toEqual([
      22, 60,
    ])
  })
})

describe("a card read over more filled runs than the most it reads", () => {
  const settings = ["sb", "sc", "sd", "se", "sf", "sg"]
  const choices = (first: ModelForm["fields"][number]): ModelForm => ({
    model: "maker/many-1",
    fields: [
      first,
      ...settings.map((name) => ({
        kind: "choice" as const,
        name,
        path: name,
        required: false,
        options: ["a", "b"],
        default: null,
      })),
    ],
  })

  it("marks the price not exact and keeps its upper end at the highest row the cut runs left out", () => {
    const form = choices({
      kind: "choice",
      name: "sa",
      path: "sa",
      required: false,
      options: ["a", "b"],
      default: null,
    })
    const rows: RateRow[] = [
      row(form.model, "sa=a"),
      { ...row(form.model, "sa=b"), credits: 100 },
      ...settings.flatMap((name) => [
        row(form.model, `${name}=a`),
        row(form.model, `${name}=b`),
      ]),
    ]
    const price = priceFromRates(rows, form, {}, "image")
    expect(price?.exact).toBe(false)
    expect(price?.credits).toBeGreaterThanOrEqual(100)
  })

  it("keeps the upper end at the longest run when the cut runs left out the longer seconds", () => {
    const form = choices({
      kind: "choice",
      name: "duration",
      path: "duration",
      required: false,
      options: ["5", "10"],
      default: null,
    })
    const rows: RateRow[] = settings.flatMap((name) => [
      { ...row(form.model, `${name}=a`, "per second"), credits: 1 },
      { ...row(form.model, `${name}=b`, "per second"), credits: 1 },
    ])
    const price = priceFromRates(rows, form, {}, "video")
    expect(price?.exact).toBe(false)
    expect(price?.credits).toBeGreaterThanOrEqual(10)
  })
})
