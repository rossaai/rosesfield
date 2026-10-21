import { describe, expect, it } from "vitest"
import {
  defaultChatModel,
  routerChatModels,
} from "#infrastructure/router-chat-models"
import {
  type RouterRecording,
  readRecordings,
  replayRecording,
  routerExchange,
  tapRouter,
} from "../fixtures/router-recording"
import {
  agentScenarios,
  cheapestPass,
  type ModelResults,
  runScenario,
  type ScenarioResult,
  scenarioOf,
} from "./agent-scenarios"

const comfyKey = "comfyui-rosesfield-test"
const recordings = readRecordings()

async function replayAll(recording: RouterRecording): Promise<ModelResults> {
  const results: ScenarioResult[] = []
  for (const scenario of agentScenarios) {
    const recorded = recording.scenarios[scenario.id]
    if (recorded === undefined) {
      continue
    }
    const replay = replayRecording(recording.model, recorded.exchanges)
    results.push(
      await runScenario(scenario, {
        model: recording.model,
        key: comfyKey,
        fetch: replay.fetch,
      })
    )
    expect(replay.left()).toBe(0)
  }
  return { model: recording.model, results }
}

function defaultRecording(): RouterRecording {
  const found = recordings.find(
    (recording) => recording.model === defaultChatModel
  )
  if (found === undefined) {
    throw new Error(`No recording holds ${defaultChatModel}`)
  }
  return found
}

describe("the agent's scenarios on recorded Router answers", () => {
  it("records only Router chat models the agent offers", () => {
    expect(recordings.length).toBeGreaterThan(0)
    for (const recording of recordings) {
      expect(routerChatModels).toContain(recording.model)
    }
  })

  for (const recording of recordings) {
    it(`replays ${recording.model} to the verdict each scenario was recorded with`, async () => {
      const { results } = await replayAll(recording)

      for (const result of results) {
        const recorded = recording.scenarios[result.scenario]
        expect({
          scenario: result.scenario,
          passed: result.problems.length === 0,
        }).toEqual({ scenario: result.scenario, passed: recorded?.passed })
      }
    })
  }

  it("defaults to the cheapest model that passes every scenario", async () => {
    const models = await Promise.all(recordings.map(replayAll))

    expect(cheapestPass(models)).toBe(defaultChatModel)
    const proven = models.find((model) => model.model === defaultChatModel)
    expect(proven?.results.map((result) => result.scenario)).toEqual(
      agentScenarios.map((scenario) => scenario.id)
    )
    for (const result of proven?.results ?? []) {
      expect(result.credits).toBeGreaterThan(0)
    }
  })

  it("fails a chain whose video is made from the run id, not from the image", async () => {
    const recorded = defaultRecording().scenarios.chain
    const exchanges = (recorded?.exchanges ?? []).map((exchange, index) =>
      index === 2
        ? routerExchange.parse(
            JSON.parse(
              JSON.stringify(exchange).replace("{{result:1}}", "{{result:0}}")
            )
          )
        : exchange
    )
    const replay = replayRecording(defaultChatModel, exchanges)

    const result = await runScenario(scenarioOf("chain"), {
      model: defaultChatModel,
      key: comfyKey,
      fetch: replay.fetch,
    })

    expect(result.problems).toContain(
      "the video is not made from the image the first run made"
    )
  })

  it("fails a turn that asks for an image when the model answers only words", async () => {
    const words = defaultRecording().scenarios.words
    const replay = replayRecording(defaultChatModel, words?.exchanges ?? [])

    const result = await runScenario(scenarioOf("propose"), {
      model: defaultChatModel,
      key: comfyKey,
      fetch: replay.fetch,
    })

    expect(result.problems).toContain("the agent proposed 0 runs, not 1")
  })

  it("keeps the ids the request named as places the replay fills again", async () => {
    const runId = "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f"
    const answer = {
      choices: [{ message: { content: `Run ${runId} is done.` } }],
    }
    const tap = tapRouter(async () => Response.json(answer))
    const sent = (id: string) => ({
      body: JSON.stringify({
        model: defaultChatModel,
        messages: [{ role: "tool", content: `{"run":{"id":"${id}"}}` }],
      }),
    })

    await tap.fetch("https://router.test", sent(runId))
    const replay = replayRecording(defaultChatModel, tap.exchanges)
    const otherId = "2d3e4f5a-6b7c-4d8e-8f9a-1b2c3d4e5f6a"
    const replayed = await replay.fetch("https://router.test", sent(otherId))

    expect(JSON.stringify(tap.exchanges[0]?.body)).toContain("{{result:0}}")
    expect(JSON.stringify(tap.exchanges[0]?.body)).not.toContain(runId)
    expect(await replayed.json()).toEqual({
      choices: [{ message: { content: `Run ${otherId} is done.` } }],
    })
  })
})
