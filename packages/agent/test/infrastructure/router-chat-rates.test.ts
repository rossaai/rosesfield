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
      tiers: ["bestValue"],
    })
    expect(opus?.efforts).toEqual(["max", "xhigh", "high", "medium", "low"])
    expect(details[defaultChatModel]?.effort).toBe("high")
    expect(details["moonshotai/kimi-k3.1-pro"]?.inputs).toContain("video")
    expect(details["z-ai/glm-5.3"]?.inputs).toEqual([])
    expect(chatDetailsOf(["maker/not-offered"])).toEqual({})
  })

  it("marks Best value only on a model with a point on the Pareto line of intelligence against cost per task", () => {
    const details = chatDetailsOf(routerChatModels)
    const valued = Object.entries(details)
      .filter(([, one]) => one.facts.scores.chat?.tiers.includes("bestValue"))
      .map(([id]) => id)
    expect(valued.sort()).toEqual([
      "anthropic/claude-opus-5.5",
      "anthropic/claude-sonnet-5.5",
      "google/gemini-4-argon",
      "openai/gpt-5.6-luna",
      "openai/gpt-6-luna",
      "openai/gpt-6.1-sol",
      "openai/gpt-6.1-terra",
      "xiaomi/mimo-v2.6-pro",
    ])
  })

  it("shows no rank on a model placed after the last scored one", () => {
    const details = chatDetailsOf(routerChatModels)
    const last = details[routerChatModels.at(-1) ?? ""]
    expect(last?.facts.scores.chat?.rank).toBeNull()
    expect(last?.facts.scores.chat?.order).toBe(274)
  })
})
