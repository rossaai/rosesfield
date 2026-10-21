import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { parseArgs } from "node:util"
import {
  ComfyRouterGenerationEngine,
  CreditMeter,
} from "@rosesfield/generation"
import { z } from "zod"
import {
  defaultChatModel,
  routerChatModels,
} from "#infrastructure/router-chat-models"
import {
  type RouterRecording,
  recordingFileOf,
  routerRecording,
  tapRouter,
} from "../fixtures/router-recording"
import {
  agentScenarios,
  cheapestPass,
  type ModelResults,
  runScenario,
  type Scenario,
  type ScenarioResult,
  scenarioOf,
} from "./agent-scenarios"

const reserveCredits = 2000
const balanceBody = z.object({ amount_cents: z.number() })

const { values } = parseArgs({
  options: {
    model: { type: "string", default: defaultChatModel },
    scenario: { type: "string", default: "all" },
    budget: { type: "string", default: "30" },
  },
})

const key = process.env.COMFY_API_KEY ?? ""
const budget = Number(values.budget)

async function balanceCredits(): Promise<number> {
  const url = `${ComfyRouterGenerationEngine.routerUrl}/customers/balance`
  const response = await fetch(url, {
    headers: { "X-API-Key": key },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new Error(`The balance read answered ${response.status}`)
  }
  const { amount_cents } = balanceBody.parse(await response.json())
  return amount_cents * CreditMeter.creditsPerCent
}

function recordingOf(model: string): RouterRecording {
  const file = recordingFileOf(model)
  return existsSync(file)
    ? routerRecording.parse(JSON.parse(readFileSync(file, "utf8")))
    : { model, scenarios: {} }
}

function modelsAsked(): readonly string[] {
  if (values.model === "all") {
    return routerChatModels
  }
  if (!routerChatModels.includes(values.model)) {
    throw new Error(
      `${values.model} is not a Router chat model the agent offers`
    )
  }
  return [values.model]
}

function scenariosAsked(): readonly Scenario[] {
  return values.scenario === "all"
    ? agentScenarios
    : [scenarioOf(values.scenario)]
}

async function recordModel(
  model: string,
  spent: { credits: number }
): Promise<ModelResults> {
  const recording = recordingOf(model)
  const results: ScenarioResult[] = []
  for (const scenario of scenariosAsked()) {
    if (spent.credits >= budget) {
      console.log(`stop: ${spent.credits} credits reach the budget ${budget}`)
      break
    }
    const tap = tapRouter((input, init) => fetch(input, init))
    const result = await runScenario(scenario, {
      model,
      key,
      fetch: tap.fetch,
    })
    spent.credits += result.credits ?? 0
    results.push(result)
    recording.scenarios[scenario.id] = {
      recordedAt: new Date().toISOString(),
      passed: result.problems.length === 0,
      exchanges: tap.exchanges,
    }
    const verdict = result.problems.length === 0 ? "pass" : "fail"
    console.log(
      [model, scenario.id, verdict, `${result.credits ?? 0} credits`]
        .concat(result.problems)
        .join("\t")
    )
  }
  writeFileSync(
    recordingFileOf(model),
    `${JSON.stringify(recording, null, 2)}\n`
  )
  return { model, results }
}

async function main(): Promise<void> {
  if (key === "") {
    throw new Error("Set COMFY_API_KEY to the Comfy key the Router meters")
  }
  const before = await balanceCredits()
  if (before - budget < reserveCredits) {
    throw new Error(
      `The balance holds ${before} credits, and the reserve is ${reserveCredits}`
    )
  }
  const spent = { credits: 0 }
  const models: ModelResults[] = []
  for (const model of modelsAsked()) {
    models.push(await recordModel(model, spent))
  }
  const after = await balanceCredits()
  console.log(`balance: ${before} credits before, ${after} after`)
  console.log(`turn credits: ${spent.credits}`)
  console.log(`cheapest pass in this run: ${cheapestPass(models) ?? "none"}`)
}

await main()
