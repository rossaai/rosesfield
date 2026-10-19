import { z } from "zod"

const bodySchema = z.record(z.string(), z.unknown())

type ToolCall = {
  id: string
  name: string
  arguments: unknown
}

type Chunk = {
  delta: Record<string, unknown>
  finishReason: "stop" | "tool_calls" | null
}

export type RecordedRequest = {
  path: string
  authorization: string | null
  body: Record<string, unknown>
}

export type FakeEndpoint = {
  baseUrl: string
  requests: RecordedRequest[]
  close: () => Promise<void>
}

function frame(model: string, chunk: Chunk): string {
  const body = {
    id: "chatcmpl-rosesfield",
    object: "chat.completion.chunk",
    created: 1_760_000_000,
    model,
    choices: [
      { index: 0, delta: chunk.delta, finish_reason: chunk.finishReason },
    ],
  }
  return `data: ${JSON.stringify(body)}\n\n`
}

function usage(model: string): string {
  const body = {
    id: "chatcmpl-rosesfield",
    object: "chat.completion.chunk",
    created: 1_760_000_000,
    model,
    choices: [],
    usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 },
  }
  return `data: ${JSON.stringify(body)}\n\n`
}

export function textStream(model: string, text: string): string {
  return [
    frame(model, {
      delta: { role: "assistant", content: "" },
      finishReason: null,
    }),
    frame(model, { delta: { content: text }, finishReason: null }),
    frame(model, { delta: {}, finishReason: "stop" }),
    usage(model),
    "data: [DONE]\n\n",
  ].join("")
}

export function toolCallStream(model: string, call: ToolCall): string {
  const toolCall = {
    index: 0,
    id: call.id,
    type: "function",
    function: { name: call.name, arguments: JSON.stringify(call.arguments) },
  }
  return [
    frame(model, {
      delta: { role: "assistant", content: null },
      finishReason: null,
    }),
    frame(model, { delta: { tool_calls: [toolCall] }, finishReason: null }),
    frame(model, { delta: {}, finishReason: "tool_calls" }),
    usage(model),
    "data: [DONE]\n\n",
  ].join("")
}

export function serveChatStreams(streams: readonly string[]): FakeEndpoint {
  const requests: RecordedRequest[] = []
  const queue = [...streams]
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url)
      requests.push({
        path: url.pathname,
        authorization: request.headers.get("authorization"),
        body: bodySchema.parse(await request.json()),
      })
      const stream = queue.shift()
      if (stream === undefined) {
        return Response.json(
          { error: { message: "no recording" } },
          { status: 500 }
        )
      }
      return new Response(stream, {
        headers: { "content-type": "text/event-stream" },
      })
    },
  })
  return {
    baseUrl: `http://127.0.0.1:${server.port}/v1`,
    requests,
    close: () => server.stop(true),
  }
}
