import { describe, expect, it } from "vitest"
import { adsPromptOf } from "#ads/ads-prompt"
import { styleValues } from "#ads/ads-values"
import {
  keepRule,
  lineLeads,
  personRule,
  stylePhrases,
  wordsLeads,
} from "#ads/comfy/ads-prompts"
import {
  characterId,
  productOne,
  productTwo,
  promptOf,
  requestFor,
  submitted,
} from "./ads-replay"

async function graphPromptOf(inputs: Record<string, unknown>): Promise<string> {
  const { workflow } = await submitted(requestFor(inputs, "1:1"))
  return promptOf(workflow, "151", "prompt")
}

describe("the prompt Ads shows in History", () => {
  it.each([...styleValues])(
    "carries the %s phrase and the sentence that keeps the product, as the graph sends it",
    async (style) => {
      const inputs = { product: [productOne], style }
      const shown = adsPromptOf(inputs)
      expect(shown).toBe(await graphPromptOf(inputs))
      expect(shown).toContain(stylePhrases[style])
      expect(shown).toContain(keepRule)
    }
  )

  it("quotes the headline and the second line as you wrote them, as the graph sends them", async () => {
    const inputs = {
      kind: "ad",
      headline: "Fresh cold brew",
      line: "Made in small batches every morning",
      product: [productOne],
    }
    const shown = adsPromptOf(inputs)
    expect(shown).toBe(await graphPromptOf(inputs))
    expect(shown).toContain(
      `${wordsLeads.ad}Fresh cold brew${lineLeads.ad}Made in small batches every morning"`
    )
  })

  it("removes a link and a line break from each field, as the graph does", async () => {
    const inputs = {
      kind: "ad",
      headline: "Fresh cold brew https://shop.example/item/42",
      line: "Made in small\nbatches https://shop.example/about",
      product: [productOne],
      secondPhoto: [productTwo],
      character: [characterId],
      style: "bold",
    }
    const shown = adsPromptOf(inputs)
    expect(shown).toBe(await graphPromptOf(inputs))
    expect(shown).not.toContain("https://")
    expect(shown).not.toContain("\n")
    expect(shown).toContain(`${wordsLeads.ad}Fresh cold brew${lineLeads.ad}`)
    expect(shown).toContain("Made in small batches")
    expect(shown.endsWith(`${keepRule}${personRule}`)).toBe(true)
  })

  it("names a scene in a product shot with no quote mark around it", async () => {
    const inputs = { product: [productOne], scene: "on a desk." }
    const shown = adsPromptOf(inputs)
    expect(shown).toBe(await graphPromptOf(inputs))
    expect(shown).toContain(" on a desk. ")
    expect(shown).not.toContain('"')
  })
})
