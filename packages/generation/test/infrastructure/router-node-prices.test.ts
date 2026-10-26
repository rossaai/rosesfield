import { describe, expect, it } from "vitest"
import type { ModelField, ModelForm } from "#domain/model-form"
import { nodePriceOf } from "#infrastructure/router/router-node-prices"
import { nodePrices } from "#infrastructure/router/router-node-prices.gen"

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
  fallback: string | null
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

const grok: ModelForm = {
  model: "xai/grok-imagine-image-2.0",
  fields: [
    prompt,
    choice("quality", ["low", "medium", "high"], null),
    choice("resolution", ["1k", "2k"], "1k"),
  ],
}

describe("the price a Comfy partner node publishes", () => {
  it("names the pinned commit and the line each price comes from", () => {
    expect(nodePrices.commit).toMatch(/^[0-9a-f]{40}$/)
    expect(nodePrices.models["bfl/flux-pro-1.1-ultra"].source).toContain(
      `/blob/${nodePrices.commit}/comfy_api_nodes/nodes_bfl.py#L`
    )
  })

  it("prices a fixed badge exactly, at 211 Comfy credits per US dollar", () => {
    const ultra: ModelForm = {
      model: "bfl/flux-pro-1.1-ultra",
      fields: [prompt],
    }
    expect(nodePriceOf(ultra, { prompt: "a" }, "image")).toEqual({
      credits: 12.66,
      low: null,
      exact: true,
      perOutput: true,
    })
  })

  it("reads the entry of the settings the run sends, and the range while one is open", () => {
    expect(
      nodePriceOf(grok, { prompt: "a", quality: "low" }, "image")
    ).toMatchObject({ credits: 8.44, low: null, exact: true })
    expect(
      nodePriceOf(
        grok,
        { prompt: "a", quality: "low", resolution: "2k" },
        "image"
      )
    ).toMatchObject({ credits: 12.66, exact: true })
    expect(nodePriceOf(grok, { prompt: "a" }, "image")).toMatchObject({
      credits: 12.66,
      low: 8.44,
      exact: false,
    })
  })

  it("prices speech per thousand characters of its text, as an estimate", () => {
    const speech: ModelForm = {
      model: "elevenlabs/eleven_v4",
      fields: [prompt],
    }
    expect(
      nodePriceOf(speech, { prompt: "a".repeat(2000) }, "audio")
    ).toMatchObject({ credits: 48.28, exact: false })
  })

  it("answers nothing for a model no partner node prices", () => {
    const other: ModelForm = { model: "maker/unlisted-1", fields: [prompt] }
    expect(nodePriceOf(other, { prompt: "a" }, "image")).toBeNull()
  })
})
