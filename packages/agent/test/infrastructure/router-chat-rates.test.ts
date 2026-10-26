import { comfyCreditsPerUsd } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { routerChatModels } from "#infrastructure/router-chat-models"
import { chatRatesOf } from "#infrastructure/router-chat-rates"
import { routerChatRates } from "#infrastructure/router-chat-rates.gen"

describe("the agent's chat model prices", () => {
  it("prices every chat model the agent offers, from OpenRouter's published list with its date", () => {
    expect(routerChatRates.source).toBe("https://openrouter.ai/api/v1/models")
    expect(routerChatRates.readOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const rates = chatRatesOf(routerChatModels)
    expect(Object.keys(rates).sort()).toEqual([...routerChatModels].sort())
    expect(routerChatModels).toHaveLength(8)
  })

  it("converts each dollar price per million tokens to Comfy credits", () => {
    const model = "anthropic/claude-sonnet-5"
    const listed = routerChatRates.models[model]
    expect(chatRatesOf([model])[model]).toEqual({
      input: Math.round(listed.input * comfyCreditsPerUsd * 100) / 100,
      output: Math.round(listed.output * comfyCreditsPerUsd * 100) / 100,
    })
    expect(chatRatesOf(["maker/not-offered"])).toEqual({})
  })
})
