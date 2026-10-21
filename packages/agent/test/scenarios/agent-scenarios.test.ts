import { describe, expect, it } from "vitest"
import {
  defaultChatModel,
  routerChatModels,
} from "#infrastructure/router-chat-models"
import {
  type ModelAnswers,
  readModelAnswers,
  replayAnswers,
  routerExchange,
} from "../fixtures/scenario-answers"
import {
  agentScenarios,
  cheapestPass,
  type ModelResults,
  runScenario,
  type ScenarioResult,
  scenarioOf,
} from "./agent-scenarios"

const comfyKey = "comfyui-rosesfield-test"
const answerFiles = readModelAnswers()

async function replayAll(answers: ModelAnswers): Promise<ModelResults> {
  const results: ScenarioResult[] = []
  for (const scenario of agentScenarios) {
    const written = answers.scenarios[scenario.id]
    if (written === undefined) {
      continue
    }
    const replay = replayAnswers(answers.model, written.exchanges)
    results.push(
      await runScenario(scenario, {
        model: answers.model,
        key: comfyKey,
        fetch: replay.fetch,
      })
    )
    expect(replay.left()).toBe(0)
  }
  return { model: answers.model, source: answers.source, results }
}

function defaultAnswers(): ModelAnswers {
  const found = answerFiles.find(
    (answers) => answers.model === defaultChatModel
  )
  if (found === undefined) {
    throw new Error(`No answer file holds ${defaultChatModel}`)
  }
  return found
}

function passing(credits: number): ScenarioResult[] {
  return agentScenarios.map((scenario) => ({
    scenario: scenario.id,
    problems: [],
    credits,
  }))
}

describe("the agent's scenarios on Router answers", () => {
  it("holds answers only for Router chat models the agent offers", () => {
    expect(answerFiles.length).toBeGreaterThan(0)
    for (const answers of answerFiles) {
      expect(routerChatModels).toContain(answers.model)
    }
  })

  for (const answers of answerFiles) {
    it(`replays ${answers.model} to the verdict each scenario expects`, async () => {
      const { results } = await replayAll(answers)

      for (const result of results) {
        const written = answers.scenarios[result.scenario]
        expect({
          scenario: result.scenario,
          passed: result.problems.length === 0,
        }).toEqual({ scenario: result.scenario, passed: written?.expectPass })
      }
    })
  }

  it("takes no hand-written answer file as Router evidence for the default", async () => {
    const handWritten = answerFiles.filter(
      (answers) => answers.source.kind === "hand-written"
    )
    const models = await Promise.all(handWritten.map(replayAll))

    expect(cheapestPass(models)).toBeNull()
  })

  it("picks the cheapest model whose captured answers pass every scenario", () => {
    const cheap = "qwen/qwen3.6-flash"
    const dear = "z-ai/glm-4.6"
    const captured = {
      kind: "captured",
      capturedAt: "2026-10-21T10:00:00.000Z",
    } as const
    const models: ModelResults[] = [
      {
        model: defaultChatModel,
        source: { kind: "hand-written" },
        results: passing(1),
      },
      { model: dear, source: captured, results: passing(9) },
      { model: cheap, source: captured, results: passing(4) },
    ]

    expect(cheapestPass(models)).toBe(cheap)
  })

  it("fails a chain whose video is made from the run id, not from the image", async () => {
    const written = defaultAnswers().scenarios.chain
    const exchanges = (written?.exchanges ?? []).map((exchange, index) =>
      index === 2
        ? routerExchange.parse(
            JSON.parse(
              JSON.stringify(exchange).replace("{{result:1}}", "{{result:0}}")
            )
          )
        : exchange
    )
    const replay = replayAnswers(defaultChatModel, exchanges)

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
    const words = defaultAnswers().scenarios.words
    const replay = replayAnswers(defaultChatModel, words?.exchanges ?? [])

    const result = await runScenario(scenarioOf("propose"), {
      model: defaultChatModel,
      key: comfyKey,
      fetch: replay.fetch,
    })

    expect(result.problems).toContain("the agent proposed 0 runs, not 1")
  })

  it("fills a written id place with the id the request holds", async () => {
    const otherId = "2d3e4f5a-6b7c-4d8e-8f9a-1b2c3d4e5f6a"
    const replay = replayAnswers(defaultChatModel, [
      {
        status: 200,
        headers: {},
        body: {
          choices: [{ message: { content: "Run {{result:0}} is done." } }],
        },
      },
    ])

    const replayed = await replay.fetch("https://router.test", {
      body: JSON.stringify({
        model: defaultChatModel,
        messages: [{ role: "tool", content: `{"run":{"id":"${otherId}"}}` }],
      }),
    })

    expect(await replayed.json()).toEqual({
      choices: [{ message: { content: `Run ${otherId} is done.` } }],
    })
  })
})
