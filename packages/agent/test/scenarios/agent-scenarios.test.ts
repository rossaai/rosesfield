import { type Run, type RunStatus, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  defaultChatModel,
  routerChatModels,
} from "#infrastructure/router-chat-models"
import {
  type ModelAnswers,
  readHandWrittenAnswers,
  readModelAnswers,
  replayAnswers,
  routerExchange,
} from "../fixtures/scenario-answers"
import { imageApp, motionApp, start } from "../sample"
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
      throw new Error(`The answers for ${answers.model} hold no ${scenario.id}`)
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

const capturedFiles = answerFiles.filter(
  (answers) => answers.source.kind === "captured"
)
const captured = {
  kind: "captured",
  capturedAt: "2026-10-21T10:00:00.000Z",
} as const
const imageOutput = "3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d"

function chainRun(options: {
  id: string
  appId: string
  status: RunStatus
  inputs: Record<string, unknown>
  outputs: string[]
}): Run {
  return run.parse({
    ...options,
    count: 1,
    aspectRatio: null,
    seed: null,
    progress: null,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: start.toISOString(),
    finishedAt: start.toISOString(),
  })
}

function failingOn(credits: number, failed: string): ScenarioResult[] {
  return agentScenarios.map((scenario) => ({
    scenario: scenario.id,
    problems: scenario.id === failed ? ["a run did not end done"] : [],
    credits,
  }))
}

function passing(credits: number | null): ScenarioResult[] {
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

  it("holds every agent scenario in each answer file", () => {
    const ids = agentScenarios.map((scenario) => scenario.id).sort()
    for (const answers of answerFiles) {
      expect({
        model: answers.model,
        scenarios: Object.keys(answers.scenarios).sort(),
      }).toEqual({ model: answers.model, scenarios: ids })
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
    const handWritten = await replayAll(readHandWrittenAnswers())

    expect(handWritten.results.map((result) => result.problems)).toEqual(
      agentScenarios.map(() => [])
    )
    expect(cheapestPass([handWritten])).toBeNull()
  })

  it("picks the cheapest model whose captured answers pass every scenario", () => {
    const cheap = "qwen/qwen3.6-flash"
    const dear = "z-ai/glm-4.6"
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

  it("skips a cheaper model that fails a scenario and a model whose credits are unknown", () => {
    const models: ModelResults[] = [
      {
        model: "qwen/qwen3.6-flash",
        source: captured,
        results: failingOn(1, "chain"),
      },
      {
        model: "anthropic/claude-sonnet-5",
        source: captured,
        results: passing(9),
      },
      {
        model: "deepseek/deepseek-v3.2",
        source: captured,
        results: passing(null),
      },
      {
        model: "google/gemini-3.5-flash",
        source: captured,
        results: passing(5),
      },
    ]

    expect(cheapestPass(models)).toBe("google/gemini-3.5-flash")
  })

  it("defaults to the cheapest model whose captured answers pass every scenario", async () => {
    const models = await Promise.all(capturedFiles.map(replayAll))

    expect(cheapestPass(models)).toBe(defaultChatModel)
  })

  it("fails a chain whose image run failed while its video run ended done", () => {
    const image = chainRun({
      id: "6d7e8f9a-0b1c-4d3e-8f4a-5b6c7d8e9f0a",
      appId: imageApp().id,
      status: "failed",
      inputs: { prompt: "A red rose" },
      outputs: [imageOutput],
    })
    const video = chainRun({
      id: "7e8f9a0b-1c2d-4e4f-9a5b-6c7d8e9f0a1b",
      appId: motionApp().id,
      status: "done",
      inputs: { image: [imageOutput], prompt: "The rose opens" },
      outputs: ["5c6d7e8f-9a0b-4c2d-9e3f-4a5b6c7d8e9f"],
    })

    const problems = scenarioOf("chain").problemsOf({
      events: [{ type: "done", credits: 1 }],
      runs: [image, video],
    })

    expect(problems).toEqual(["a run did not end done"])
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
