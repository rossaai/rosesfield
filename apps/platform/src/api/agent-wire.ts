import { buildPath, type ErrorBody, errorBody } from "@rosesfield/contract"
import { callPath, callPathFor, fieldOf } from "@/api/call-path"
import { creditsOf, type Proposal, readProposal } from "@/api/conversation-wire"

export type AnswerEvent =
  | { type: "message"; index: number; text: string }
  | { type: "run"; runId: string }
  | { type: "proposal"; proposal: Proposal }
  | { type: "done"; credits: number | null }
  | { type: "failed"; error: { code: string; status: number } }

export type AgentModelRate = { input: number; output: number }

export type AgentModels = {
  models: string[]
  model: string | null
  refusal: ErrorBody | null
  rates: Readonly<Record<string, AgentModelRate>>
}

function isCredits(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function readRates(body: unknown): Record<string, AgentModelRate> {
  const held = fieldOf(body, "rates")
  if (typeof held !== "object" || held === null) {
    return {}
  }
  const rates: Record<string, AgentModelRate> = {}
  for (const [model, rate] of Object.entries(held)) {
    const input = fieldOf(rate, "input")
    const output = fieldOf(rate, "output")
    if (isCredits(input) && isCredits(output)) {
      rates[model] = { input, output }
    }
  }
  return rates
}

const sendPath = "/api/agent/conversations/:conversationId/messages"
const modelsPath = "/api/agent/models"

export function readAgentModels(body: unknown): AgentModels | null {
  const models = fieldOf(body, "models")
  const given = fieldOf(body, "model")
  const model = given === null || typeof given === "string" ? given : undefined
  const refusal = errorBody.nullable().safeParse(fieldOf(body, "refusal"))
  if (
    !Array.isArray(models) ||
    !models.every((one): one is string => typeof one === "string") ||
    model === undefined ||
    !refusal.success
  ) {
    return null
  }
  return { models, model, refusal: refusal.data, rates: readRates(body) }
}

export function listAgentModels(signal?: AbortSignal): Promise<AgentModels> {
  return callPathFor(
    { method: "GET", path: modelsPath, signal },
    readAgentModels
  )
}

export function chooseAgentModel(model: string): Promise<AgentModels> {
  return callPathFor(
    { method: "PATCH", path: modelsPath, body: { model } },
    readAgentModels
  )
}

export function readAnswerEvent(value: unknown): AnswerEvent | null {
  const type = fieldOf(value, "type")
  const index = fieldOf(value, "index")
  const text = fieldOf(value, "text")
  const runId = fieldOf(value, "runId")
  if (
    type === "message" &&
    typeof index === "number" &&
    typeof text === "string"
  ) {
    return { type, index, text }
  }
  if (type === "run" && typeof runId === "string") {
    return { type, runId }
  }
  if (type === "proposal") {
    const proposal = readProposal(fieldOf(value, "proposal"))
    return proposal === null ? null : { type, proposal }
  }
  if (type === "done") {
    return { type, credits: creditsOf(fieldOf(value, "credits")) }
  }
  const error = errorBody.safeParse(fieldOf(value, "error"))
  return type === "failed" && error.success ? { type, error: error.data } : null
}

function* framesOf(buffer: string): Generator<{ frame: string; rest: string }> {
  let rest = buffer
  let end = rest.indexOf("\n\n")
  while (end >= 0) {
    yield { frame: rest.slice(0, end), rest: rest.slice(end + 2) }
    rest = rest.slice(end + 2)
    end = rest.indexOf("\n\n")
  }
}

function eventOf(frame: string): AnswerEvent | null {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
  try {
    return data === "" ? null : readAnswerEvent(JSON.parse(data))
  } catch {
    return null
  }
}

export async function* sendMessage(
  conversationId: string,
  text: string,
  signal: AbortSignal
): AsyncGenerator<AnswerEvent> {
  const response = await callPath({
    method: "POST",
    path: buildPath(sendPath, { conversationId }),
    body: { text },
    accept: "application/json, text/event-stream",
    signal,
  })
  const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  while (reader !== undefined) {
    const chunk = await reader.read()
    if (chunk.done) {
      return
    }
    buffer = (buffer + chunk.value).replaceAll("\r\n", "\n")
    for (const { frame, rest } of framesOf(buffer)) {
      buffer = rest
      const event = eventOf(frame)
      if (event !== null) {
        yield event
      }
    }
  }
}
