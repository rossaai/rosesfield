import { listApps } from "@rosesfield/catalog"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { openPiModels, routerAgentModel } from "#infrastructure/pi-models"
import type { Fetch } from "#infrastructure/router-chat-fetch"
import {
  defaultChatModel,
  type RouterChatModel,
  routerChat,
  routerChatModelOf,
} from "#infrastructure/router-chat-models"
import {
  agentMessage,
  chatDetailsOf,
  messageCreditsOf,
  reasoningTokensOf,
  repeatedRateOf,
} from "#infrastructure/router-chat-rates"
import { FakeAssetRepository } from "../fake/fake-asset-repository"
import { FakeCharacterRepository } from "../fake/fake-character-repository"
import { replayRouter, textAnswer } from "../fixtures/router-chat-answers"
import { readModelAnswers, replayAnswers } from "../fixtures/scenario-answers"
import { agentFor, allToolsFor, generationFor, readAll } from "../harness"
import { agentScenarios, runScenario } from "../scenarios/agent-scenarios"

type Sent = { role: string; content: unknown }

type Request = {
  repeatedBytes: number
  conversationBytes: number
  bodyBytes: number
  promptTokens: number
  visibleTokens: number
}

const encoder = new TextEncoder()
const perMillion = 1_000_000
const creditsPerUsd = 211

function bytesOf(value: unknown): number {
  return encoder.encode(JSON.stringify(value ?? [])).length
}

function isRepeated(message: Sent): boolean {
  return message.role === "system" || message.role === "developer"
}

function partsOf(body: Record<string, unknown>): {
  repeated: number
  conversation: number
} {
  const messages = (body.messages ?? []) as Sent[]
  return {
    repeated: bytesOf(messages.filter(isRepeated)) + bytesOf(body.tools ?? []),
    conversation: bytesOf(messages.filter((one) => !isRepeated(one))),
  }
}

function medianOf(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

const usage = z.object({
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    completion_tokens_details: z
      .object({ reasoning_tokens: z.number().optional() })
      .optional(),
  }),
})

async function capturedRequests(): Promise<{
  requests: Request[]
  perMessage: number[]
}> {
  const requests: Request[] = []
  const perMessage: number[] = []
  for (const answers of readModelAnswers()) {
    if (answers.source.kind !== "captured") {
      continue
    }
    for (const scenario of agentScenarios) {
      const written = answers.scenarios[scenario.id]
      if (written === undefined) {
        continue
      }
      const replay = replayAnswers(answers.model, written.exchanges)
      const sent: Record<string, unknown>[] = []
      const fetch: Fetch = async (input, init) => {
        sent.push(JSON.parse(String(init?.body ?? "{}")))
        return replay.fetch(input, init)
      }
      await runScenario(scenario, { model: answers.model, key: "k", fetch })
      perMessage.push(sent.length)
      sent.forEach((body, at) => {
        const { usage: used } = usage.parse(written.exchanges[at]?.body)
        const { repeated, conversation } = partsOf(body)
        requests.push({
          repeatedBytes: repeated,
          conversationBytes: conversation,
          bodyBytes: repeated + conversation,
          promptTokens: used.prompt_tokens,
          visibleTokens:
            used.completion_tokens -
            (used.completion_tokens_details?.reasoning_tokens ?? 0),
        })
      })
    }
  }
  return { requests, perMessage }
}

async function catalogRepeatedBytes(): Promise<number> {
  const apps = listApps()
  const tools = allToolsFor(apps, generationFor(apps), {
    assets: new FakeAssetRepository(),
    characters: new FakeCharacterRepository(),
  })
  const replay = replayRouter([textAnswer(defaultChatModel, "Hi.", 0.0001)])
  const rig = agentFor(tools, () =>
    openPiModels(routerAgentModel("k"), { fetch: replay.fetch })
  )
  try {
    const { id } = await rig.agent.startConversation({ runApproval: "ask" })
    await readAll(await rig.agent.send({ conversationId: id, text: "Hi" }))
    return partsOf(replay.requests[0]?.body ?? {}).repeated
  } finally {
    await rig.close()
  }
}

function modelOf(id: string): RouterChatModel {
  const found = routerChatModelOf(id)
  if (found === undefined) {
    throw new Error(`The table lists no ${id}`)
  }
  return found
}

const opus = "anthropic/claude-opus-5.5"

describe("one agent message's tokens", () => {
  it("bills no captured request more prompt tokens than one per 3 bytes of its messages and tools", async () => {
    const { requests } = await capturedRequests()
    expect(requests.length).toBeGreaterThanOrEqual(20)
    for (const request of requests) {
      expect(request.promptTokens).toBeLessThanOrEqual(
        request.bodyBytes / agentMessage.bytesPerToken
      )
    }
  })

  it("holds the median conversation, visible answer and requests of the captured scenarios", async () => {
    const { requests, perMessage } = await capturedRequests()
    expect({
      conversationTokens: Math.ceil(
        medianOf(requests.map((one) => one.conversationBytes)) /
          agentMessage.bytesPerToken
      ),
      outputTokens: Math.ceil(
        medianOf(requests.map((one) => one.visibleTokens))
      ),
      requests: Math.ceil(medianOf(perMessage)),
    }).toEqual({
      conversationTokens: agentMessage.conversationTokens,
      outputTokens: agentMessage.outputTokens,
      requests: agentMessage.requests,
    })
  })

  it("holds the instructions and the tools of every app in the catalog within 5 percent of the body the agent sends", async () => {
    const measured = Math.ceil(
      (await catalogRepeatedBytes()) / agentMessage.bytesPerToken
    )
    expect(
      Math.abs(agentMessage.repeatedTokens - measured) / measured
    ).toBeLessThanOrEqual(0.05)
  })
})

describe("one agent message's credits", () => {
  it("gives reasoning the share of the answer's cap OpenRouter names for each effort, at least 1,024 tokens, and none with no effort", () => {
    expect(routerChat.maxTokens).toBe(8192)
    expect({
      max: reasoningTokensOf("max"),
      xhigh: reasoningTokensOf("xhigh"),
      high: reasoningTokensOf("high"),
      medium: reasoningTokensOf("medium"),
      low: reasoningTokensOf("low"),
      minimal: reasoningTokensOf("minimal"),
      none: reasoningTokensOf("none"),
      unset: reasoningTokensOf(null),
    }).toEqual({
      max: 7783,
      xhigh: 7783,
      high: 6554,
      medium: 4096,
      low: 1639,
      minimal: 1024,
      none: 0,
      unset: 0,
    })
  })

  it("bills the repeated part at the published cache read rate of a model OpenRouter caches with no marker, and at the input rate otherwise", () => {
    const flash = modelOf(defaultChatModel)
    expect(flash.lab).toBe("deepseek")
    expect(flash.usdPer1M.cacheRead).not.toBeNull()
    expect(repeatedRateOf(flash)).toBe(flash.usdPer1M.cacheRead)
    const claude = modelOf(opus)
    expect(claude.usdPer1M.cacheRead).not.toBeNull()
    expect(repeatedRateOf(claude)).toBe(claude.usdPer1M.input)
    const unpublished = {
      lab: "deepseek",
      usdPer1M: { input: 1, output: 2, cacheRead: null },
    }
    expect(repeatedRateOf(unpublished)).toBe(1)
  })

  it("prices each request from the tokens times the model's rates, times the requests of a message", () => {
    const rates = {
      lab: "openai",
      usdPer1M: { input: 2, output: 10, cacheRead: 0.5 },
    }
    const request =
      agentMessage.repeatedTokens * 0.5 +
      agentMessage.conversationTokens * 2 +
      (agentMessage.outputTokens + 6554) * 10
    expect(messageCreditsOf(rates, "high")).toBeCloseTo(
      (request * agentMessage.requests * creditsPerUsd) / perMillion,
      4
    )
    expect(messageCreditsOf(rates, "low")).toBeLessThan(
      messageCreditsOf(rates, "high")
    )
  })

  it("lists a message's credits at every effort a model offers, and once with no effort for a model with none to choose", () => {
    const details = chatDetailsOf([
      opus,
      defaultChatModel,
      "openai/gpt-5.2-chat",
    ])
    expect(details[opus]?.messages.map((one) => one.effort)).toEqual(
      modelOf(opus).efforts
    )
    expect(details["openai/gpt-5.2-chat"]?.messages).toEqual([
      {
        effort: null,
        credits: messageCreditsOf(modelOf("openai/gpt-5.2-chat"), null),
      },
    ])
    const high = details[opus]?.messages.find((one) => one.effort === "high")
    expect(high?.credits).toBe(messageCreditsOf(modelOf(opus), "high"))
  })
})
