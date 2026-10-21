import { z } from "zod"
import type { Fetch } from "#infrastructure/router-chat-fetch"

const bodySchema = z.record(z.string(), z.unknown())

export type RouterAnswer = {
  status: number
  body: unknown
  headers?: Record<string, string>
}

export type RouterRequest = {
  url: string
  headers: Headers
  body: Record<string, unknown>
}

export type RouterReplay = {
  fetch: Fetch
  requests: RouterRequest[]
}

type ToolCall = {
  id: string
  name: string
  arguments: unknown
}

function completion(model: string, message: unknown, cost: number): unknown {
  const calls = z
    .object({ tool_calls: z.array(z.unknown()) })
    .safeParse(message)
  return {
    id: "gen-1760000000-rosesfield",
    object: "chat.completion",
    created: 1_760_000_000,
    model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: calls.success ? "tool_calls" : "stop",
      },
    ],
    usage: {
      prompt_tokens: 812,
      completion_tokens: 24,
      total_tokens: 836,
      cost,
    },
  }
}

export function textAnswer(
  model: string,
  text: string,
  cost: number
): RouterAnswer {
  return {
    status: 200,
    body: completion(model, { role: "assistant", content: text }, cost),
  }
}

export function toolCallAnswer(
  model: string,
  call: ToolCall,
  cost: number
): RouterAnswer {
  const toolCall = {
    id: call.id,
    type: "function",
    function: { name: call.name, arguments: JSON.stringify(call.arguments) },
  }
  return {
    status: 200,
    body: completion(
      model,
      { role: "assistant", content: null, tool_calls: [toolCall] },
      cost
    ),
  }
}

export function refusedAnswer(
  status: number,
  errorType: string,
  detail: string
): RouterAnswer {
  return {
    status,
    body: { detail, error_type: errorType },
    headers: { "X-Comfy-Error-Type": errorType },
  }
}

export type RouterAnswerOf = (request: RouterRequest) => RouterAnswer

export function replayRouter(
  answers: readonly (RouterAnswer | RouterAnswerOf)[]
): RouterReplay {
  const requests: RouterRequest[] = []
  const queue = [...answers]
  const fetch: Fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    const next = queue.shift()
    if (next === undefined) {
      throw new Error(`No recorded Router answer for ${url}`)
    }
    const request = {
      url,
      headers: new Request(url, init).headers,
      body: bodySchema.parse(JSON.parse(String(init?.body ?? "{}"))),
    }
    requests.push(request)
    const answer = typeof next === "function" ? next(request) : next
    return Response.json(answer.body, {
      status: answer.status,
      headers: answer.headers ?? {},
    })
  }
  return { fetch, requests }
}
