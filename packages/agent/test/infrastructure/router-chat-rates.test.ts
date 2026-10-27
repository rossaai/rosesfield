import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  defaultChatModel,
  type RouterChatModel,
  routerChatModelOf,
  routerChatModels,
} from "#infrastructure/router-chat-models"
import {
  chatDetailsOf,
  turnCreditsOf,
  typicalTurn,
} from "#infrastructure/router-chat-rates"

const answers = join(import.meta.dirname, "../fixtures/scenario-answers")

type Usage = { prompt_tokens: number; completion_tokens: number }

function usageOf(exchange: unknown): Usage {
  const body =
    typeof exchange === "object" && exchange !== null && "body" in exchange
      ? exchange.body
      : null
  const usage =
    typeof body === "object" && body !== null && "usage" in body
      ? body.usage
      : null
  if (
    typeof usage !== "object" ||
    usage === null ||
    !("prompt_tokens" in usage) ||
    !("completion_tokens" in usage) ||
    typeof usage.prompt_tokens !== "number" ||
    typeof usage.completion_tokens !== "number"
  ) {
    throw new Error("an exchange holds no usage")
  }
  return {
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
  }
}

function turnsOf(file: string): { input: number; output: number }[] {
  const parsed: {
    scenarios: Record<string, { exchanges: unknown[] }>
  } = JSON.parse(readFileSync(join(answers, file), "utf8"))
  return Object.values(parsed.scenarios).map((scenario) =>
    scenario.exchanges.map(usageOf).reduce(
      (turn, usage) => ({
        input: turn.input + usage.prompt_tokens,
        output: turn.output + usage.completion_tokens,
      }),
      { input: 0, output: 0 }
    )
  )
}

function medianOf(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

function modelOf(id: string): RouterChatModel {
  const found = routerChatModelOf(id)
  if (found === undefined) {
    throw new Error(`The table lists no ${id}`)
  }
  return found
}

describe("the agent's chat model rows", () => {
  it("prices a turn of the default model at its opening effort from the typical turn's tokens", () => {
    const usd = (0.15 * 1650 + 0.6 * 400) / 1_000_000
    expect(turnCreditsOf(modelOf(defaultChatModel), "max")).toBeCloseTo(
      usd * 211,
      4
    )
  })

  it("scales a turn's output by the effort's output tokens per task over the default model's, and keeps 400 where the table holds none", () => {
    const opus = modelOf("anthropic/claude-opus-5.5")
    const low = (4 * 1650 + 20 * 400 * (10_151 / 89_495)) / 1_000_000
    const max = (4 * 1650 + 20 * 400 * (119_166 / 89_495)) / 1_000_000
    expect(turnCreditsOf(opus, "low")).toBeCloseTo(low * 211, 4)
    expect(turnCreditsOf(opus, "max")).toBeCloseTo(max * 211, 4)
    const unmeasured = modelOf("openai/gpt-5.2-chat")
    expect(unmeasured.points).toEqual([])
    expect(turnCreditsOf(unmeasured, null)).toBeCloseTo(
      ((1.75 * 1650 + 14 * 400) / 1_000_000) * 211,
      4
    )
  })

  it("lists each model's rank, inputs, reasoning, rates per 1M and turn at every effort it offers", () => {
    const details = chatDetailsOf(routerChatModels)
    expect(Object.keys(details)).toHaveLength(274)
    const opus = details["anthropic/claude-opus-5.5"]
    expect(opus).toMatchObject({
      name: "Claude Opus 5.5",
      context: 1_000_000,
      inputs: ["image", "file"],
      reasons: true,
      input: 844,
      output: 4220,
      effort: "max",
    })
    expect(opus?.facts.scores.chat).toMatchObject({
      rank: 1,
      order: 1,
      of: 274,
      tiers: ["bestValue"],
    })
    expect(opus?.efforts.map((one) => one.effort)).toEqual([
      "max",
      "xhigh",
      "high",
      "medium",
      "low",
    ])
    expect(opus?.efforts.find((one) => one.effort === "max")?.turn).toBe(
      opus?.turn
    )
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

  it("holds the median input and output tokens per turn of the captured scenario answers, each turn summed over its calls", () => {
    const turns = readdirSync(answers)
      .filter((file) => file.endsWith(".json"))
      .flatMap(turnsOf)
    expect(turns).toHaveLength(9)
    expect(typicalTurn).toEqual({
      source: "packages/agent/test/fixtures/scenario-answers/*.json",
      readOn: typicalTurn.readOn,
      inputTokens: medianOf(turns.map((turn) => turn.input)),
      outputTokens: medianOf(turns.map((turn) => turn.output)),
    })
    expect(typicalTurn.readOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
