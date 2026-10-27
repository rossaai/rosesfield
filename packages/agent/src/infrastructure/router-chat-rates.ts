import { comfyCreditsPerUsd, type ModelFacts } from "@rosesfield/catalog/comfy"
import type { AgentModelDetail } from "#agent.contract"
import {
  isOnLine,
  openEffortOf,
  type RouterChatModel,
  type RouterChatTable,
  routerChatData,
  routerChatModelOf,
} from "#infrastructure/router-chat-models"

export const chatTask = "chat"

function creditsOf(usd: number): number {
  return Math.round(usd * comfyCreditsPerUsd * 10_000) / 10_000
}

function lastScoredOf(table: RouterChatTable): number {
  return Math.max(
    0,
    ...table.models.flatMap((one) => (one.score === null ? [] : [one.rank]))
  )
}

function factsOf(
  model: RouterChatModel,
  table: RouterChatTable,
  lastScored: number
): ModelFacts {
  const readOn = table.readOn
  return {
    lab: null,
    release: null,
    weights: null,
    lineKey: null,
    scores: {
      [chatTask]: {
        score: model.score,
        rank: model.rank <= lastScored ? model.rank : null,
        order: model.rank,
        of: table.models.length,
        sources: model.boards.flatMap((board) => {
          const listed = table.boards[board]
          return listed === undefined
            ? []
            : [
                {
                  board,
                  url: listed.url,
                  readOn,
                  display: listed.display ? "allowed" : "refused",
                },
              ]
        }),
        tiers: isOnLine(model) ? ["bestValue"] : [],
      },
    },
  }
}

export function chatDetailOf(
  model: RouterChatModel,
  table: RouterChatTable = routerChatData,
  lastScored: number = lastScoredOf(table)
): AgentModelDetail {
  return {
    name: model.name,
    lab: model.lab,
    facts: factsOf(model, table, lastScored),
    context: model.context,
    inputs: model.inputs,
    input: creditsOf(model.usdPer1M.input),
    output: creditsOf(model.usdPer1M.output),
    effort: openEffortOf(model),
    efforts: model.efforts,
  }
}

/** Reads each listed chat model's row: its rank, what it can do, its credits per million input and output tokens, the effort it opens on and the efforts it offers. */
export function chatDetailsOf(
  models: readonly string[]
): Record<string, AgentModelDetail> {
  const found: Record<string, AgentModelDetail> = {}
  const lastScored = lastScoredOf(routerChatData)
  for (const id of models) {
    const model = routerChatModelOf(id)
    if (model !== undefined) {
      found[id] = chatDetailOf(model, routerChatData, lastScored)
    }
  }
  return found
}
