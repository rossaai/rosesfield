import { comfyCreditsPerUsd } from "@rosesfield/catalog/comfy"
import type { AgentModelRate } from "#agent.contract"
import { routerChatRates } from "#infrastructure/router-chat-rates.gen"

const rates: Readonly<
  Record<string, { readonly input: number; readonly output: number }>
> = routerChatRates.models

function creditsOf(usd: number): number {
  return Math.round(usd * comfyCreditsPerUsd * 100) / 100
}

/** Reads the Comfy credits per million input and output tokens of each chat model, from the prices OpenRouter publishes, which bill every agent turn. */
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
      }
    }
  }
  return found
}
