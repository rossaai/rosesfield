import { basename } from "node:path"
import { describe, expect, it } from "vitest"
import type { Fetch } from "#infrastructure/router-chat-fetch"
import { defaultChatModel } from "#infrastructure/router-chat-models"
import {
  answersFileOf,
  answersTextOf,
  type CallBudget,
  captureAnswers,
  captureLimits,
  captureOptionsOf,
  recordingFetch,
} from "../../scripts/capture-scenario-answers"
import {
  type ModelAnswers,
  modelAnswers,
  readHandWrittenAnswers,
  replayAnswers,
} from "../fixtures/scenario-answers"
import { agentScenarios, runScenario } from "../scenarios/agent-scenarios"

const comfyKey = "comfyui-rosesfield-test"
const capturedAt = new Date("2026-10-21T10:00:00.000Z")

function fakeRouterOf(answers: ModelAnswers): Fetch {
  const exchanges = agentScenarios.flatMap(
    (scenario) => answers.scenarios[scenario.id]?.exchanges ?? []
  )
  return replayAnswers(answers.model, exchanges).fetch
}

function freshBudget(): CallBudget {
  return { ceiling: captureLimits.callCeiling, used: 0 }
}

function sentWith(ids: { asset: string; run: string; output: string }) {
  return {
    body: JSON.stringify({
      model: defaultChatModel,
      messages: [
        { role: "user", content: `Use asset ${ids.asset}` },
        {
          role: "tool",
          content: JSON.stringify({
            run: { id: ids.run, outputs: [ids.output] },
          }),
        },
      ],
    }),
  }
}

describe("the capture of Router answers", () => {
  it("drops every header that carries a key or a cookie", async () => {
    const router: Fetch = async () =>
      new Response("{}", {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "session=abc",
          "x-api-key": comfyKey,
          authorization: `Bearer ${comfyKey}`,
          "x-comfy-request-id": "req-1",
        },
      })
    const recorder = recordingFetch(router, freshBudget())

    await recorder.fetch(
      "https://router.test",
      sentWith({
        asset: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
        run: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
        output: "3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f",
      })
    )

    expect(recorder.exchanges[0]?.headers).toEqual({
      "content-type": "application/json",
      "x-comfy-request-id": "req-1",
    })
  })

  it("writes the ids that change between runs as places the replay fills", async () => {
    const live = {
      asset: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      run: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
      output: "3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f",
    }
    const later = {
      asset: "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a",
      run: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b",
      output: "6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b9c",
    }
    const router: Fetch = async () =>
      Response.json({
        choices: [
          {
            message: {
              content: `Run ${live.run} made ${live.output} from ${live.asset}.`,
            },
          },
        ],
      })
    const recorder = recordingFetch(router, freshBudget())
    await recorder.fetch("https://router.test", sentWith(live))
    const replay = replayAnswers(defaultChatModel, recorder.exchanges)

    const replayed = await replay.fetch("https://router.test", sentWith(later))

    expect(recorder.exchanges[0]?.body).toEqual({
      choices: [
        {
          message: {
            content: "Run {{result:0}} made {{result:1}} from {{seen:0}}.",
          },
        },
      ],
    })
    expect(await replayed.json()).toEqual({
      choices: [
        {
          message: {
            content: `Run ${later.run} made ${later.output} from ${later.asset}.`,
          },
        },
      ],
    })
  })

  it("refuses to start without a Comfy key", () => {
    expect(() =>
      captureOptionsOf(["--model", defaultChatModel], { COMFY_API_KEY: "" })
    ).toThrow("COMFY_API_KEY is unset")
    expect(() => captureOptionsOf(["--model", defaultChatModel], {})).toThrow(
      "COMFY_API_KEY is unset"
    )
  })

  it("refuses a model the agent does not offer", () => {
    expect(() =>
      captureOptionsOf(["--model", "acme/unlisted"], {
        COMFY_API_KEY: comfyKey,
      })
    ).toThrow("--model acme/unlisted")
  })

  it("makes at most 12 Router calls in one run", async () => {
    let calls = 0
    const router: Fetch = async () => {
      calls += 1
      return Response.json({})
    }
    const recorder = recordingFetch(router, freshBudget())
    const sent = sentWith({
      asset: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      run: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
      output: "3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f",
    })
    for (let index = 0; index < 12; index += 1) {
      await recorder.fetch("https://router.test", sent)
    }

    await expect(recorder.fetch("https://router.test", sent)).rejects.toThrow(
      "The capture stops at 12 Router calls"
    )
    expect(calls).toBe(12)
  })

  it("names the answer file the replay reads for a model", () => {
    expect(basename(answersFileOf("deepseek/deepseek-v4.1-flash-1017"))).toBe(
      "deepseek-deepseek-v4-1-flash-1017.json"
    )
  })

  it("refuses to write answers that hold the Comfy key", () => {
    const answers = modelAnswers.parse({
      model: defaultChatModel,
      source: { kind: "captured", capturedAt: capturedAt.toISOString() },
      scenarios: {
        words: {
          expectPass: true,
          exchanges: [{ status: 200, headers: {}, body: { echo: comfyKey } }],
        },
      },
    })

    expect(() => answersTextOf(answers, comfyKey)).toThrow("Nothing is written")
  })

  it("captures answers that read back and replay to every verdict", async () => {
    const written = readHandWrittenAnswers()
    const lines: string[] = []

    const answers = await captureAnswers({
      model: written.model,
      key: comfyKey,
      fetch: fakeRouterOf(written),
      now: () => capturedAt,
      log: (line) => lines.push(line),
    })
    const read = modelAnswers.parse(
      JSON.parse(answersTextOf(answers, comfyKey))
    )

    expect(read.source).toEqual({
      kind: "captured",
      capturedAt: capturedAt.toISOString(),
    })
    expect(read.scenarios).toEqual(written.scenarios)
    for (const scenario of agentScenarios) {
      const replay = replayAnswers(
        read.model,
        read.scenarios[scenario.id]?.exchanges ?? []
      )
      const result = await runScenario(scenario, {
        model: read.model,
        key: comfyKey,
        fetch: replay.fetch,
      })
      expect({ scenario: scenario.id, problems: result.problems }).toEqual({
        scenario: scenario.id,
        problems: [],
      })
      expect(replay.left()).toBe(0)
    }
    expect(lines).toContain("words turn 1: usage.cost 0.00021")
    expect(lines.at(-1)).toMatch(/^\d+ Router calls, total usage\.cost /)
  })
})
