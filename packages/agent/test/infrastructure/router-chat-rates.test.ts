import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { comfyCreditsPerUsd } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { routerChatModels } from "#infrastructure/router-chat-models"
import { chatRatesOf, typicalTurn } from "#infrastructure/router-chat-rates"
import { routerChatRates } from "#infrastructure/router-chat-rates.gen"

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

function creditsOf(usd: number): number {
  return Math.round(usd * comfyCreditsPerUsd * 100) / 100
}

describe("the agent's chat model prices", () => {
  it("prices every chat model the agent offers, from OpenRouter's published list with its date", () => {
    expect(routerChatRates.source).toBe("https://openrouter.ai/api/v1/models")
    expect(routerChatRates.readOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const rates = chatRatesOf(routerChatModels)
    expect(Object.keys(rates).sort()).toEqual([...routerChatModels].sort())
    expect(routerChatModels).toHaveLength(8)
  })

  it("converts each dollar price per million tokens to Comfy credits, and prices a typical turn from its medians", () => {
    const model = "anthropic/claude-sonnet-5"
    const listed = routerChatRates.models[model]
    expect(chatRatesOf([model])[model]).toEqual({
      input: creditsOf(listed.input),
      output: creditsOf(listed.output),
      turn: creditsOf((listed.input * 1650 + listed.output * 400) / 1_000_000),
    })
    expect(chatRatesOf(["maker/not-offered"])).toEqual({})
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
