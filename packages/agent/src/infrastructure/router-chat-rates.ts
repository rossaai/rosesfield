import { comfyCreditsPerUsd } from "@rosesfield/catalog/comfy"
import type { AgentModelRate } from "#agent.contract"
import { routerChatRates } from "#infrastructure/router-chat-rates.gen"

const rates: Readonly<
  Record<string, { readonly input: number; readonly output: number }>
> = routerChatRates.models

/** The tokens of a typical agent turn: the median input and output tokens per turn, each turn summed over its model calls, across the captured scenario answers. */
export const typicalTurn = {
  source: "packages/agent/test/fixtures/scenario-answers/*.json",
  readOn: "2026-10-26",
  inputTokens: 1650,
  outputTokens: 400,
} as const

const perMillion = 1_000_000

function creditsOf(usd: number): number {
  return Math.round(usd * comfyCreditsPerUsd * 100) / 100
}

function turnUsdOf(rate: { input: number; output: number }): number {
  return (
    (rate.input * typicalTurn.inputTokens +
      rate.output * typicalTurn.outputTokens) /
    perMillion
  )
}

/** Reads the Comfy credits per million input and output tokens of each chat model, and of its typical turn, from the prices OpenRouter publishes, which bill every agent turn. */
export function chatRatesOf(
  models: readonly string[]
): Record<string, AgentModelRate> {
  const found: Record<string, AgentModelRate> = {}
  for (const model of models) {
    const rate = Object.hasOwn(rates, model) ? rates[model] : undefined
    if (rate !== undefined) {
      found[model] = {
        input: creditsOf(rate.input),
        output: creditsOf(rate.output),
        turn: creditsOf(turnUsdOf(rate)),
      }
    }
  }
  return found
}
