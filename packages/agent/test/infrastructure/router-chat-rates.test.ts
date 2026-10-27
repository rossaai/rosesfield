import { describe, expect, it } from "vitest"
import {
  defaultChatModel,
  routerChatModels,
} from "#infrastructure/router-chat-models"
import { chatDetailsOf } from "#infrastructure/router-chat-rates"

describe("the agent's chat model rows", () => {
  it("lists each model's rank, inputs, rates per 1M, the effort it opens on and every effort it offers", () => {
    const details = chatDetailsOf(routerChatModels)
    expect(Object.keys(details)).toHaveLength(274)
    const opus = details["anthropic/claude-opus-5.5"]
    expect(opus).toMatchObject({
      name: "Claude Opus 5.5",
      context: 1_000_000,
      inputs: ["image", "file"],
      input: 844,
      output: 4220,
      effort: "high",
    })
    expect(opus).not.toHaveProperty("reasons")
    expect(opus).not.toHaveProperty("turn")
    expect(opus?.facts.scores.chat).toMatchObject({
      rank: 1,
      order: 1,
      of: 274,
      tiers: [],
    })
    expect(opus?.efforts).toEqual(["max", "xhigh", "high", "medium", "low"])
    expect(details[defaultChatModel]?.effort).toBe("high")
    expect(details["moonshotai/kimi-k3.1-pro"]?.inputs).toContain("video")
    expect(details["z-ai/glm-5.3"]?.inputs).toEqual([])
    expect(chatDetailsOf(["maker/not-offered"])).toEqual({})
  })

  it("names no Best value tier, because the model picker computes it from the price of one message", () => {
    const details = chatDetailsOf(routerChatModels)
    expect(
      Object.values(details).filter(
        (one) => (one.facts.scores.chat?.tiers.length ?? 0) > 0
      )
    ).toEqual([])
  })

  it("shows no rank on a model placed after the last scored one", () => {
    const details = chatDetailsOf(routerChatModels)
    const last = details[routerChatModels.at(-1) ?? ""]
    expect(last?.facts.scores.chat?.rank).toBeNull()
    expect(last?.facts.scores.chat?.order).toBe(274)
  })
})
