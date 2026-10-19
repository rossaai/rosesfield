import { afterEach, describe, expect, it } from "vitest"
import {
  type AnswerEvent,
  readAnswerEvent,
  sendMessage,
} from "@/api/agent-wire"
import { GatewayRefusedError } from "@/api/gateway-refused.error"

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
    expect(readAnswerEvent({ type: "done" })).toEqual({ type: "done" })
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
      runId: null,
    }
    expect(readAnswerEvent({ type: "proposal", proposal })).toEqual({
      type: "proposal",
      proposal,
    })
    expect(
      readAnswerEvent({ type: "proposal", proposal: { ...proposal, id: 7 } })
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
          `${runId}"}\r\n\r\nevent: done\ndata: {"type":"done"}\n\n`,
        ]),
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
    )
    expect(await collect()).toEqual([
      { type: "message", index: 0, text: "Hi" },
      { type: "run", runId },
      { type: "done" },
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
