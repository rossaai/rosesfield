import { afterEach, describe, expect, it } from "vitest"
import {
  type AnswerEvent,
  chooseAgentModel,
  listAgentModels,
  readAgentModels,
  readAnswerEvent,
  sendMessage,
} from "@/api/agent-wire"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { agentDetailOf } from "../screens/agent/agent-details"

const conversationId = "2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d"
const runId = "3b4c5d6e-7f80-4a9b-8c1d-2e3f4a5b6c7d"
const realFetch = globalThis.fetch

function streamOf(chunks: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start: (controller) => {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

function answerWith(response: Response): void {
  globalThis.fetch = async () => response
}

async function collect(): Promise<AnswerEvent[]> {
  const events: AnswerEvent[] = []
  for await (const event of sendMessage(
    conversationId,
    "Hello",
    new AbortController().signal
  )) {
    events.push(event)
  }
  return events
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe("readAnswerEvent", () => {
  it("reads each event the agent sends", () => {
    expect(readAnswerEvent({ type: "message", index: 0, text: "Hi" })).toEqual({
      type: "message",
      index: 0,
      text: "Hi",
    })
    expect(readAnswerEvent({ type: "run", runId })).toEqual({
      type: "run",
      runId,
    })
    expect(readAnswerEvent({ type: "done" })).toEqual({
      type: "done",
      credits: null,
    })
    expect(readAnswerEvent({ type: "done", credits: 0.084 })).toEqual({
      type: "done",
      credits: 0.084,
    })
    expect(
      readAnswerEvent({
        type: "failed",
        error: { code: "AGENT_ANSWER_FAILED", status: 502 },
      })
    ).toEqual({
      type: "failed",
      error: { code: "AGENT_ANSWER_FAILED", status: 502 },
    })
  })

  it("reads a proposal and refuses one it cannot read", () => {
    const proposal = {
      id: "4c5d6e7f-8091-4a2b-8c3d-4e5f6a7b8c9d",
      appId: "image",
      request: { inputs: { prompt: "Hi" }, count: 1, aspectRatio: null },
      status: "proposed",
      runIds: [],
      credits: null,
    }
    expect(readAnswerEvent({ type: "proposal", proposal })).toEqual({
      type: "proposal",
      proposal,
    })
    expect(
      readAnswerEvent({
        type: "proposal",
        proposal: { ...proposal, credits: 17.62 },
      })
    ).toEqual({ type: "proposal", proposal: { ...proposal, credits: 17.62 } })
    expect(
      readAnswerEvent({ type: "proposal", proposal: { ...proposal, id: 7 } })
    ).toBeNull()
    expect(
      readAnswerEvent({
        type: "proposal",
        proposal: { ...proposal, runIds: [runId, 7] },
      })
    ).toBeNull()
  })

  it("refuses an event with a missing field", () => {
    expect(readAnswerEvent({ type: "message", text: "Hi" })).toBeNull()
    expect(readAnswerEvent({ type: "failed" })).toBeNull()
    expect(readAnswerEvent({ type: "unknown" })).toBeNull()
  })
})

describe("sendMessage", () => {
  it("reads events whose frames are split across chunks", async () => {
    answerWith(
      new Response(
        streamOf([
          'event: message\ndata: {"type":"message","index":0,',
          '"text":"Hi"}\n\nevent: run\r\ndata: {"type":"run","runId":"',
          `${runId}"}\r\n\r\nevent: done\ndata: {"type":"done","credits":0.5}\n\n`,
        ]),
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
    )
    expect(await collect()).toEqual([
      { type: "message", index: 0, text: "Hi" },
      { type: "run", runId },
      { type: "done", credits: 0.5 },
    ])
  })

  it("turns a refusal into a gateway error with its code", async () => {
    answerWith(
      Response.json(
        { error: { code: "AGENT_MODEL_MISSING", status: 412 } },
        { status: 412 }
      )
    )
    await expect(collect()).rejects.toMatchObject({
      constructor: GatewayRefusedError,
      code: "AGENT_MODEL_MISSING",
      status: 412,
    })
  })
})

describe("the agent's models", () => {
  const listed = {
    models: ["deepseek/deepseek-v4-flash", "qwen/qwen3.6-flash"],
    model: "deepseek/deepseek-v4-flash",
    refusal: null,
  }

  it("reads the models, the chosen one and a refusal", () => {
    expect(readAgentModels(listed)).toEqual({ ...listed, details: {} })
    expect(
      readAgentModels({ ...listed, recent: ["qwen/qwen3.6-flash"] })
    ).toEqual({ ...listed, details: {} })
    expect(
      readAgentModels({
        models: [],
        model: null,
        refusal: { code: "ENGINE_NOT_ENABLED", status: 412 },
      })
    ).toEqual({
      models: [],
      model: null,
      refusal: { code: "ENGINE_NOT_ENABLED", status: 412 },
      details: {},
    })
    expect(readAgentModels({ ...listed, models: [7] })).toBeNull()
    expect(readAgentModels({ ...listed, refusal: { code: 1 } })).toBeNull()
  })

  it("reads each model's row and drops one it cannot read", () => {
    const row = agentDetailOf({ name: "Claude Opus 5.5", input: 844 })
    expect(
      readAgentModels({
        ...listed,
        details: {
          "anthropic/claude-opus-5.5": row,
          "qwen/qwen3.6-flash": { ...row, input: "cheap" },
          "z-ai/glm-5.3": { ...row, effort: "huge" },
        },
      })?.details
    ).toEqual({ "anthropic/claude-opus-5.5": row })
  })

  it("reads the list and sends a choice as a PATCH", async () => {
    const sent: { url: string; init: RequestInit | undefined }[] = []
    globalThis.fetch = async (input, init) => {
      sent.push({ url: String(input), init })
      return Response.json(listed)
    }

    expect(await listAgentModels()).toEqual({
      ...listed,
      details: {},
    })
    expect(await chooseAgentModel("qwen/qwen3.6-flash")).toEqual({
      ...listed,
      details: {},
    })
    expect(sent.map((one) => [one.url, one.init?.method])).toEqual([
      ["/api/agent/models", "GET"],
      ["/api/agent/models", "PATCH"],
    ])
    expect(sent[1]?.init?.body).toBe(
      JSON.stringify({ model: "qwen/qwen3.6-flash" })
    )
  })
})
