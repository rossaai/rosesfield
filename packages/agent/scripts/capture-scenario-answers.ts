import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { z } from "zod"
import { costOf, type Fetch } from "#infrastructure/router-chat-fetch"
import { isRouterChatModel } from "#infrastructure/router-chat-models"
import {
  answersFolder,
  type ModelAnswers,
  modelAnswers,
  placeholdersFor,
  type RouterExchange,
  type ScenarioAnswers,
  sentOf,
} from "../test/fixtures/scenario-answers"
import { agentScenarios, runScenario } from "../test/scenarios/agent-scenarios"

export type CallBudget = {
  ceiling: number
  used: number
}

export type Recorder = {
  fetch: Fetch
  exchanges: RouterExchange[]
  failures: string[]
}

export type CaptureOptions = {
  model: string
  key: string
}

type CaptureRun = CaptureOptions & {
  fetch: Fetch
  now: () => Date
  log: (line: string) => void
}

export const captureLimits = {
  callCeiling: 12,
  callTimeoutMs: 90_000,
}

const secretHeaderPattern = /key|cookie|authorization|token|secret/i
const rewrittenHeaders: readonly string[] = [
  "content-length",
  "content-encoding",
  "transfer-encoding",
]

export function keptHeadersOf(headers: Headers): Record<string, string> {
  return Object.fromEntries(
    [...headers.entries()].filter(
      ([name]) =>
        !secretHeaderPattern.test(name) && !rewrittenHeaders.includes(name)
    )
  )
}

function bodyOf(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function signalOf(init: RequestInit | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(captureLimits.callTimeoutMs)
  return init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
}

export function recordingFetch(fetch: Fetch, budget: CallBudget): Recorder {
  const exchanges: RouterExchange[] = []
  const failures: string[] = []
  const recording: Fetch = async (input, init) => {
    if (budget.used >= budget.ceiling) {
      const refusal = `The capture stops at ${budget.ceiling} Router calls`
      failures.push(refusal)
      throw new Error(refusal)
    }
    budget.used += 1
    const response = await fetch(input, {
      ...init,
      signal: signalOf(init),
    }).catch((error: unknown) => {
      failures.push(error instanceof Error ? error.message : String(error))
      throw error
    })
    const text = await response.text()
    exchanges.push({
      status: response.status,
      headers: keptHeadersOf(response.headers),
      body: placeholdersFor(bodyOf(text), sentOf(init)),
    })
    return new Response(text, {
      status: response.status,
      headers: response.headers,
    })
  }
  return { fetch: recording, exchanges, failures }
}

export function captureOptionsOf(
  argv: readonly string[],
  env: Record<string, string | undefined>
): CaptureOptions {
  const { values } = parseArgs({
    args: [...argv],
    options: { model: { type: "string" } },
  })
  const key = z.string().min(1).safeParse(env.COMFY_API_KEY)
  if (!key.success) {
    throw new Error("COMFY_API_KEY is unset. The capture needs a Comfy key")
  }
  const model = values.model
  if (model === undefined || !isRouterChatModel(model)) {
    throw new Error(
      `--model ${model ?? "is missing"}: name a model of routerChatModels`
    )
  }
  return { model, key: key.data }
}

export function answersFileOf(model: string): string {
  return join(answersFolder, `${model.replace(/[^a-z0-9]+/gi, "-")}.json`)
}

function costLine(cost: number | null): string {
  return cost === null ? "none" : String(cost)
}

export async function captureAnswers(run: CaptureRun): Promise<ModelAnswers> {
  const budget: CallBudget = { ceiling: captureLimits.callCeiling, used: 0 }
  const scenarios: Record<string, ScenarioAnswers> = {}
  let total = 0
  for (const scenario of agentScenarios) {
    const recorder = recordingFetch(run.fetch, budget)
    const result = await runScenario(scenario, {
      model: run.model,
      key: run.key,
      fetch: recorder.fetch,
    })
    if (recorder.failures.length > 0) {
      throw new Error(`${scenario.id}: ${recorder.failures.join(". ")}`)
    }
    recorder.exchanges.forEach((exchange, index) => {
      const cost = costOf(exchange.body)
      total += cost ?? 0
      run.log(`${scenario.id} turn ${index + 1}: usage.cost ${costLine(cost)}`)
    })
    for (const problem of result.problems) {
      run.log(`${scenario.id} fails: ${problem}`)
    }
    scenarios[scenario.id] = {
      expectPass: result.problems.length === 0,
      exchanges: recorder.exchanges,
    }
  }
  run.log(`${budget.used} Router calls, total usage.cost ${total}`)
  return modelAnswers.parse({
    model: run.model,
    source: { kind: "captured", capturedAt: run.now().toISOString() },
    scenarios,
  })
}

export function answersTextOf(answers: ModelAnswers, key: string): string {
  const text = `${JSON.stringify(answers, null, 2)}\n`
  if (text.includes(key)) {
    throw new Error(
      "The captured answers hold the Comfy key. Nothing is written"
    )
  }
  return text
}

if (import.meta.main) {
  try {
    const options = captureOptionsOf(process.argv.slice(2), process.env)
    const answers = await captureAnswers({
      ...options,
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
      log: (line) => console.log(line),
    })
    const file = answersFileOf(options.model)
    writeFileSync(file, answersTextOf(answers, options.key))
    const root = fileURLToPath(new URL("../../..", import.meta.url))
    Bun.spawnSync(["bun", "x", "biome", "format", "--write", file], {
      cwd: root,
    })
    console.log(`wrote ${file}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
