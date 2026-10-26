import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai"
import type { ToolRegistration } from "@earendil-works/pi-durable"
import { findApp } from "@rosesfield/catalog"
import { autoRunLimitCredits } from "@rosesfield/catalog/comfy"
import { EngineUnavailableError } from "@rosesfield/generation"
import { afterEach, describe, expect, it } from "vitest"
import type { AnswerEvent, RunApproval } from "#agent.contract"
import type { FakePrice } from "../fake/fake-price-engine"
import {
  type AgentRig,
  agentFor,
  appToolsFor,
  type Generation,
  generationFor,
  readAll,
} from "../harness"
import { imageApp } from "../sample"

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

type Turn = {
  generation: Generation
  events: AnswerEvent[]
  told: string
}

function storyboardApp() {
  const found = findApp("storyboard")
  if (found === null) {
    throw new Error("The catalog lists no Storyboard")
  }
  return found
}

async function callApp(
  approval: RunApproval,
  price: FakePrice,
  call: { app: "image" | "storyboard"; inputs: Record<string, string> }
): Promise<Turn> {
  const app = call.app === "image" ? imageApp() : storyboardApp()
  const generation = generationFor([app])
  generation.prices.price = price
  let told = ""
  const tools = appToolsFor([app], generation).map(
    (tool): ToolRegistration => ({
      ...tool,
      execute: async (args, api, context) => {
        const result = await tool.execute(args, api, context)
        told = (result.output ?? [])
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join("")
        return result
      },
    })
  )
  rig = agentFor(tools)
  rig.faux.setResponses([
    fauxAssistantMessage([fauxToolCall(app.id, { inputs: call.inputs })], {
      stopReason: "toolUse",
    }),
    fauxAssistantMessage("done"),
  ])
  const { id } = await rig.agent.startConversation({ runApproval: approval })
  const events = await readAll(
    await rig.agent.send({ conversationId: id, text: "Make it" })
  )
  return { generation, events, told }
}

function rose(approval: RunApproval, price: FakePrice): Promise<Turn> {
  return callApp(approval, price, {
    app: "image",
    inputs: { prompt: "a red rose" },
  })
}

function hasProposal(events: readonly AnswerEvent[]): boolean {
  return events.some((event) => event.type === "proposal")
}

describe("the run mode an app tool follows", () => {
  it("under auto, starts a run priced at the limit without asking", async () => {
    const { generation, events } = await rose("auto", {
      source: "rates",
      credits: autoRunLimitCredits,
    })

    expect(generation.runs.count).toBe(1)
    expect(events.some((event) => event.type === "run")).toBe(true)
    expect(hasProposal(events)).toBe(false)
    expect(generation.prices.priced).toHaveLength(1)
  })

  it("under auto, proposes a run over the limit, starts nothing, and tells the model its price", async () => {
    const { generation, events, told } = await rose("auto", {
      source: "measured",
      credits: autoRunLimitCredits + 1,
    })

    expect(generation.runs.count).toBe(0)
    expect(generation.jobs.enqueued).toEqual([])
    expect(hasProposal(events)).toBe(true)
    expect(JSON.parse(told)).toMatchObject({
      credits: autoRunLimitCredits + 1,
      askAboveCredits: autoRunLimitCredits,
    })
    expect(JSON.parse(told).note).toContain(
      `${autoRunLimitCredits + 1} credits, more than the ${autoRunLimitCredits} credits`
    )
  })

  it("under auto, proposes a run with no known price", async () => {
    const { generation, events, told } = await rose("auto", {
      source: "unknown",
      credits: null,
    })

    expect(generation.runs.count).toBe(0)
    expect(hasProposal(events)).toBe(true)
    expect(JSON.parse(told)).toMatchObject({ credits: null })
    expect(JSON.parse(told).note).toContain("its price is not known")
  })

  it("under auto, starts a run whose rate card price is at the limit", async () => {
    const { generation, events } = await rose("auto", {
      source: "rates",
      credits: autoRunLimitCredits,
      from: "rate-card",
    })

    expect(generation.runs.count).toBe(1)
    expect(hasProposal(events)).toBe(false)
  })

  it("under auto, reads a range's upper end and proposes a run whose low end is under the limit", async () => {
    const { generation, events } = await rose("auto", {
      source: "estimate",
      credits: autoRunLimitCredits + 1,
      low: 1,
      from: "rate-card",
    })

    expect(generation.runs.count).toBe(0)
    expect(hasProposal(events)).toBe(true)
  })

  it.each(["model-runs", "task-runs"] as const)(
    "under auto, proposes a run priced from %s, an estimate that can sit below the bill",
    async (from) => {
      const { generation, events, told } = await rose("auto", {
        source: "estimate",
        credits: 1,
        from,
      })

      expect(generation.runs.count).toBe(0)
      expect(generation.jobs.enqueued).toEqual([])
      expect(hasProposal(events)).toBe(true)
      expect(JSON.parse(told)).toMatchObject({ credits: null })
      expect(JSON.parse(told).note).toContain("its price is not known")
    }
  )

  it("under auto, proposes a Storyboard when one keyframe is priced from other runs", async () => {
    const { generation, events } = await callApp(
      "auto",
      { source: "estimate", credits: 1, from: "task-runs" },
      {
        app: "storyboard",
        inputs: {
          sceneCount: "2",
          scene1: "a fox at dusk",
          scene2: "the fox in snow",
        },
      }
    )

    expect(generation.runs.count).toBe(0)
    expect(hasProposal(events)).toBe(true)
  })

  it("under auto, proposes a run whose pricing fails and never starts it", async () => {
    const { generation, events } = await rose(
      "auto",
      new EngineUnavailableError({})
    )

    expect(generation.prices.priced).toHaveLength(1)
    expect(generation.runs.count).toBe(0)
    expect(generation.jobs.enqueued).toEqual([])
    expect(hasProposal(events)).toBe(true)
  })

  it("under ask, proposes even a cheap run without pricing it", async () => {
    const { generation, events, told } = await rose("ask", {
      source: "rates",
      credits: 1,
    })

    expect(generation.runs.count).toBe(0)
    expect(hasProposal(events)).toBe(true)
    expect(generation.prices.priced).toEqual([])
    expect(JSON.parse(told)).not.toHaveProperty("credits")
  })

  it("under auto, prices every keyframe of a Storyboard and proposes the chain when their sum passes the limit", async () => {
    const each = Math.floor(autoRunLimitCredits / 3) + 1
    const { generation, events, told } = await callApp(
      "auto",
      { source: "rates", credits: each },
      {
        app: "storyboard",
        inputs: {
          sceneCount: "3",
          scene1: "a fox at dusk",
          scene2: "the fox in snow",
          scene3: "the fox at dawn",
        },
      }
    )

    expect(generation.prices.priced).toHaveLength(3)
    expect(generation.runs.count).toBe(0)
    expect(hasProposal(events)).toBe(true)
    expect(JSON.parse(told)).toMatchObject({ credits: each * 3 })
  })

  it("under auto, starts a Storyboard whose keyframes sum to the limit or less", async () => {
    const each = Math.floor(autoRunLimitCredits / 3)
    const { generation, events } = await callApp(
      "auto",
      { source: "rates", credits: each },
      {
        app: "storyboard",
        inputs: {
          sceneCount: "3",
          scene1: "a fox at dusk",
          scene2: "the fox in snow",
          scene3: "the fox at dawn",
        },
      }
    )

    expect(generation.prices.priced).toHaveLength(3)
    expect(generation.runs.count).toBe(1)
    expect(hasProposal(events)).toBe(false)
  })
})
