import { comfyCreditsPerUsd, type ModelFacts } from "@rosesfield/catalog/comfy"
import type { AgentEffort, AgentModelDetail } from "#agent.contract"
import {
  hasEffortChoice,
  openEffortOf,
  type RouterChatModel,
  type RouterChatTable,
  routerChat,
  routerChatData,
  routerChatModelOf,
} from "#infrastructure/router-chat-models"

export const chatTask = "chat"

/** The tokens of one agent message, measured from the request body the agent builds for every app of the catalog and from the captured scenario answers, at one token per 3 bytes of the body's messages and tools. */
export const agentMessage = {
  source: "packages/agent/test/fixtures/scenario-answers/*.json",
  readOn: "2026-10-30",
  bytesPerToken: 3,
  repeatedTokens: 15_271,
  conversationTokens: 341,
  outputTokens: 67,
  requests: 1,
} as const

/** The share of an answer's cap OpenRouter gives to reasoning at each effort, per https://openrouter.ai/docs/guides/best-practices/reasoning-tokens. */
export const reasoningShare = {
  max: 0.95,
  xhigh: 0.95,
  high: 0.8,
  medium: 0.5,
  low: 0.2,
  minimal: 0.1,
  none: 0,
} as const satisfies Record<AgentEffort, number>

/** The labs whose models OpenRouter caches with no cache marker in the request, per https://openrouter.ai/docs/guides/best-practices/prompt-caching. */
export const implicitCacheLabs: readonly string[] = [
  "openai",
  "deepseek",
  "z-ai",
  "x-ai",
  "moonshotai",
]

/** The Qwen models OpenRouter's caching guide names for Alibaba's explicit caching. The guide says snapshot endpoints "do not support explicit caching", so every other Qwen model gets no marker and no cache read price. */
export const explicitCacheQwen: {
  readonly source: string
  readonly readOn: string
  readonly models: readonly string[]
} = {
  source: "https://openrouter.ai/docs/guides/best-practices/prompt-caching",
  readOn: "2026-10-26",
  models: [
    "qwen/qwen3-max",
    "qwen/qwen-plus",
    "qwen/qwen3.6-plus",
    "qwen/qwen3-coder-plus",
    "qwen/qwen3-coder-flash",
  ],
}

/** The labs whose models OpenRouter caches only when the request marks what to cache with `cache_control`, per the same guide, with the factor of the input rate each bills a 5-minute cache write at: "charged at 1.25x the price of the original input pricing" for Anthropic and for Alibaba's explicit caching. */
export const markedCacheLabs: ReadonlyMap<string, { writeFactor: number }> =
  new Map([
    ["anthropic", { writeFactor: 1.25 }],
    ["qwen", { writeFactor: 1.25 }],
  ])

/** Whether the agent marks its instructions and tools for caching on a model: on every Anthropic model, and on a Qwen model the guide names for explicit caching. */
export function marksCache(
  model: Pick<RouterChatModel, "id" | "lab">
): boolean {
  if (model.lab === "qwen") {
    return explicitCacheQwen.models.includes(model.id)
  }
  return markedCacheLabs.has(model.lab)
}

function cachesOf(model: Pick<RouterChatModel, "id" | "lab">): boolean {
  return implicitCacheLabs.includes(model.lab) || marksCache(model)
}

const reasoningBounds = { least: 1024, most: 128_000 }

const perMillion = 1_000_000

function creditsOf(usd: number): number {
  return Math.round(usd * comfyCreditsPerUsd * 10_000) / 10_000
}

/** The reasoning tokens OpenRouter allows a request at one effort: max(min(max_tokens times the effort's share, 128,000), 1,024), and none at the effort none or with no effort. */
export function reasoningTokensOf(effort: AgentEffort | null): number {
  const share = effort === null ? 0 : reasoningShare[effort]
  if (share === 0) {
    return 0
  }
  return Math.max(
    Math.min(Math.ceil(routerChat.maxTokens * share), reasoningBounds.most),
    reasoningBounds.least
  )
}

type PricedModel = Pick<RouterChatModel, "id" | "usdPer1M" | "lab">

/** The rate per 1M tokens of the part each request repeats: the cache read rate OpenRouter publishes for a model that caches, with or without the agent's marker, else the input rate. The first request's cache write is not priced. */
export function repeatedRateOf(model: PricedModel): number {
  const { input, cacheRead } = model.usdPer1M
  return cacheRead !== null && cachesOf(model) ? cacheRead : input
}

/** The rate per 1M tokens of the conversation: on a marked model pi-ai marks the newest message, so every request writes the conversation to the cache, at the cache write rate OpenRouter publishes, else at the input rate times the lab's write factor. An unmarked model bills it at the input rate. */
export function conversationRateOf(model: PricedModel): number {
  const { input, cacheWrite } = model.usdPer1M
  const lab = markedCacheLabs.get(model.lab)
  if (lab === undefined || !marksCache(model)) {
    return input
  }
  return cacheWrite ?? input * lab.writeFactor
}

/** The Comfy credits of one agent message at one effort: each request bills the instructions and the tools at the repeated rate, the conversation at the conversation rate, and the visible answer and the effort's reasoning budget at the output rate, times the requests of a message. */
export function messageCreditsOf(
  model: PricedModel,
  effort: AgentEffort | null
): number {
  const { output } = model.usdPer1M
  const request =
    agentMessage.repeatedTokens * repeatedRateOf(model) +
    agentMessage.conversationTokens * conversationRateOf(model) +
    (agentMessage.outputTokens + reasoningTokensOf(effort)) * output
  return creditsOf((request * agentMessage.requests) / perMillion)
}

function messagesOf(model: RouterChatModel): AgentModelDetail["messages"] {
  return hasEffortChoice(model)
    ? model.efforts.map((effort) => ({
        effort,
        credits: messageCreditsOf(model, effort),
      }))
    : [{ effort: null, credits: messageCreditsOf(model, null) }]
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
        tiers: [],
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
    messages: messagesOf(model),
  }
}

/** Reads each listed chat model's row: its rank, what it can do, its credits per million input and output tokens, the effort it opens on, the efforts it offers and the credits of one message at each. */
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
