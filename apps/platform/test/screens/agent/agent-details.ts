import type { AgentModelDetail } from "@/api/agent-wire"

type DetailChange = Partial<Omit<AgentModelDetail, "facts">> & {
  rank?: number | null
  order?: number
  bestValue?: boolean
}

const board = {
  board: "Arena Text, style control",
  url: "https://arena.ai/leaderboard/text",
  readOn: "2026-10-26",
  display: "allowed",
} as const

/** A chat model's row as the gateway lists it, from a few of its fields. */
export function agentDetailOf(change: DetailChange = {}): AgentModelDetail {
  const { rank = 1, order = 1, bestValue = false, ...rest } = change
  return {
    name: "Chat Small",
    lab: "maker",
    facts: {
      lab: null,
      release: null,
      weights: null,
      lineKey: null,
      scores: {
        chat: {
          score: rank === null ? null : 90,
          rank,
          order,
          of: 274,
          sources: rank === null ? [] : [board],
          tiers: bestValue ? ["bestValue"] : [],
        },
      },
    },
    context: 131_072,
    inputs: [],
    input: 21.1,
    output: 84.4,
    effort: null,
    efforts: [],
    ...rest,
  }
}
