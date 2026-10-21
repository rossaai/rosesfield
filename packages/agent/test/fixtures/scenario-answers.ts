import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"
import type { Fetch } from "#infrastructure/router-chat-fetch"

const uuidPattern =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const placeholderPattern = /\{\{(result|seen):(\d+)\}\}/g

export const routerExchange = z.object({
  status: z.number().int(),
  headers: z.record(z.string(), z.string()),
  body: z.unknown(),
})

export const answerSource = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hand-written") }),
  z.object({ kind: z.literal("captured"), capturedAt: z.iso.datetime() }),
])

export const scenarioAnswers = z.object({
  expectPass: z.boolean(),
  exchanges: z.array(routerExchange),
})

export const modelAnswers = z.object({
  model: z.string(),
  source: answerSource,
  scenarios: z.record(z.string(), scenarioAnswers),
})

export type RouterExchange = z.infer<typeof routerExchange>
export type AnswerSource = z.infer<typeof answerSource>
export type ScenarioAnswers = z.infer<typeof scenarioAnswers>
export type ModelAnswers = z.infer<typeof modelAnswers>

export type AnswersReplay = {
  fetch: Fetch
  left: () => number
}

export const answersFolder = fileURLToPath(
  new URL("./scenario-answers/", import.meta.url)
)

export function readModelAnswers(): ModelAnswers[] {
  return readdirSync(answersFolder)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) =>
      modelAnswers.parse(
        JSON.parse(readFileSync(join(answersFolder, name), "utf8"))
      )
    )
}

function idsOf(text: string): string[] {
  return [...new Set(text.match(uuidPattern) ?? [])].map((id) =>
    id.toLowerCase()
  )
}

type Seen = {
  result: string[]
  seen: string[]
}

function seenIn(sent: unknown): Seen {
  const messages = z
    .object({
      messages: z.array(z.object({ role: z.string(), content: z.unknown() })),
    })
    .catch({ messages: [] })
    .parse(sent).messages
  const lastResult = messages.findLast((message) => message.role === "tool")
  return {
    result: idsOf(JSON.stringify(lastResult?.content ?? "")),
    seen: idsOf(JSON.stringify(messages)),
  }
}

function idsFor(answer: string, seen: Seen): string {
  return answer.replace(placeholderPattern, (placeholder, where, rank) => {
    const ids = where === "result" ? seen.result : seen.seen
    const id = ids[Number(rank)]
    if (id === undefined) {
      throw new Error(
        `The scenario answer names ${placeholder}, and the request holds no such id`
      )
    }
    return id
  })
}

function placeOf(id: string, seen: Seen): string {
  const lower = id.toLowerCase()
  const result = seen.result.indexOf(lower)
  if (result >= 0) {
    return `{{result:${result}}}`
  }
  const anywhere = seen.seen.indexOf(lower)
  return anywhere >= 0 ? `{{seen:${anywhere}}}` : id
}

export function placeholdersFor(answer: unknown, sent: unknown): unknown {
  const seen = seenIn(sent)
  return JSON.parse(
    JSON.stringify(answer).replace(uuidPattern, (id) => placeOf(id, seen))
  )
}

export function sentOf(init: RequestInit | undefined): unknown {
  return JSON.parse(String(init?.body ?? "{}"))
}

export function replayAnswers(
  model: string,
  exchanges: readonly RouterExchange[]
): AnswersReplay {
  const queue = [...exchanges]
  const fetch: Fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    const exchange = queue.shift()
    if (exchange === undefined) {
      throw new Error(`No scenario answer is left for ${url}`)
    }
    const sent = sentOf(init)
    const asked = z.object({ model: z.string() }).safeParse(sent)
    if (!asked.success || asked.data.model !== model) {
      throw new Error(
        `The answers are for ${model}, and the agent asked ${asked.data?.model ?? "no model"}`
      )
    }
    const body = idsFor(JSON.stringify(exchange.body), seenIn(sent))
    return new Response(body, {
      status: exchange.status,
      headers: { "content-type": "application/json", ...exchange.headers },
    })
  }
  return { fetch, left: () => queue.length }
}
