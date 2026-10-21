import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"
import type { Fetch } from "#infrastructure/router-chat-fetch"

const uuidPattern =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const placeholderPattern = /\{\{(result|seen):(\d+)\}\}/g
const keptHeaders: readonly string[] = [
  "content-type",
  "retry-after",
  "x-comfy-error-type",
  "x-comfy-credits-used",
]

export const routerExchange = z.object({
  status: z.number().int(),
  headers: z.record(z.string(), z.string()),
  body: z.unknown(),
})

export const scenarioRecording = z.object({
  recordedAt: z.string().nullable(),
  passed: z.boolean(),
  exchanges: z.array(routerExchange),
})

export const routerRecording = z.object({
  model: z.string(),
  scenarios: z.record(z.string(), scenarioRecording),
})

export type RouterExchange = z.infer<typeof routerExchange>
export type ScenarioRecording = z.infer<typeof scenarioRecording>
export type RouterRecording = z.infer<typeof routerRecording>

export type RecordingReplay = {
  fetch: Fetch
  left: () => number
}

export type RecordingTap = {
  fetch: Fetch
  exchanges: RouterExchange[]
}

export const recordingsFolder = fileURLToPath(
  new URL("./router-recordings/", import.meta.url)
)

export function recordingFileOf(model: string): string {
  const name = model.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")
  return join(recordingsFolder, `${name}.json`)
}

export function readRecordings(): RouterRecording[] {
  return readdirSync(recordingsFolder)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) =>
      routerRecording.parse(
        JSON.parse(readFileSync(join(recordingsFolder, name), "utf8"))
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

function placeholdersOf(answer: string, seen: Seen): string {
  return answer.replace(uuidPattern, (id) => {
    const lower = id.toLowerCase()
    const inResult = seen.result.indexOf(lower)
    if (inResult >= 0) {
      return `{{result:${inResult}}}`
    }
    const inSeen = seen.seen.indexOf(lower)
    return inSeen >= 0 ? `{{seen:${inSeen}}}` : id
  })
}

function idsFor(answer: string, seen: Seen): string {
  return answer.replace(placeholderPattern, (placeholder, where, rank) => {
    const ids = where === "result" ? seen.result : seen.seen
    const id = ids[Number(rank)]
    if (id === undefined) {
      throw new Error(
        `The recorded answer names ${placeholder}, and the request holds no such id`
      )
    }
    return id
  })
}

function jsonOrText(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function sentOf(init: RequestInit | undefined): unknown {
  return JSON.parse(String(init?.body ?? "{}"))
}

export function replayRecording(
  model: string,
  exchanges: readonly RouterExchange[]
): RecordingReplay {
  const queue = [...exchanges]
  const fetch: Fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    const exchange = queue.shift()
    if (exchange === undefined) {
      throw new Error(`No recorded Router answer for ${url}`)
    }
    const sent = sentOf(init)
    const asked = z.object({ model: z.string() }).safeParse(sent)
    if (!asked.success || asked.data.model !== model) {
      throw new Error(
        `The recording answers ${model}, and the agent asked ${asked.data?.model ?? "no model"}`
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

export function tapRouter(fetch: Fetch): RecordingTap {
  const exchanges: RouterExchange[] = []
  const tapped: Fetch = async (input, init) => {
    const response = await fetch(input, init)
    const text = await response.text()
    const headers = Object.fromEntries(
      keptHeaders.flatMap((name) => {
        const value = response.headers.get(name)
        return value === null ? [] : [[name, value]]
      })
    )
    const body = jsonOrText(text)
    exchanges.push({
      status: response.status,
      headers,
      body: JSON.parse(
        placeholdersOf(JSON.stringify(body), seenIn(sentOf(init)))
      ),
    })
    return new Response(text, {
      status: response.status,
      headers: response.headers,
    })
  }
  return { fetch: tapped, exchanges }
}
