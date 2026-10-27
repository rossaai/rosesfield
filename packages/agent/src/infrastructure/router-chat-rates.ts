import { comfyCreditsPerUsd, type ModelFacts } from "@rosesfield/catalog/comfy"
import type { AgentEffort, AgentModelDetail } from "#agent.contract"
import {
  defaultChatModel,
  isOnLine,
  pointOf,
  type RouterChatModel,
  type RouterChatTable,
  routerChatData,
  routerChatModelOf,
} from "#infrastructure/router-chat-models"

/** The tokens of a typical agent turn: the median input and output tokens per turn, each turn summed over its model calls, across the captured scenario answers. */
export const typicalTurn = {
  source: "packages/agent/test/fixtures/scenario-answers/*.json",
  readOn: "2026-10-26",
  inputTokens: 1650,
  outputTokens: 400,
} as const

export const chatTask = "chat"

const perMillion = 1_000_000

function creditsOf(usd: number): number {
  return Math.round(usd * comfyCreditsPerUsd * 10_000) / 10_000
}

function referenceTokensOf(): number | null {
  const base = routerChatModelOf(defaultChatModel)
  return base === undefined
    ? null
    : (pointOf(base, base.openEffort)?.outputTokensPerTask ?? null)
}

const referenceTokens = referenceTokensOf()

function outputTokensOf(
  model: RouterChatModel,
  effort: AgentEffort | null,
  reference: number | null = referenceTokens
): number {
  const own = pointOf(model, effort)?.outputTokensPerTask ?? null
  return own === null || reference === null
    ? typicalTurn.outputTokens
    : (typicalTurn.outputTokens * own) / reference
}

/** The Comfy credits of a typical turn of a chat model at one effort: the typical turn's input and output tokens times its rates, with the output scaled by that effort's output tokens per task over the default model's where the table holds both. */
export function turnCreditsOf(
  model: RouterChatModel,
  effort: AgentEffort | null
): number {
  const usd =
    (model.usdPer1M.input * typicalTurn.inputTokens +
      model.usdPer1M.output * outputTokensOf(model, effort)) /
    perMillion
  return creditsOf(usd)
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
    reasons: model.reasons,
    input: creditsOf(model.usdPer1M.input),
    output: creditsOf(model.usdPer1M.output),
    turn: turnCreditsOf(model, model.openEffort),
    effort: model.openEffort,
    efforts: model.efforts.map((effort) => ({
      effort,
      turn: turnCreditsOf(model, effort),
    })),
  }
}

/** Reads each listed chat model's row: its rank, what it can do, its credits per million input and output tokens and per typical turn at each effort it offers. */
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
