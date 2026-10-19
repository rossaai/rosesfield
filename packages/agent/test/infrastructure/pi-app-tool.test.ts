import {
  fauxAssistantMessage,
  fauxText,
  fauxToolCall,
  getCurrentTools,
} from "@earendil-works/pi-ai"
import { afterEach, describe, expect, it } from "vitest"
import {
  type AgentRig,
  agentFor,
  appToolsFor,
  type Generation,
  generationFor,
  lastMessageOf,
  lastToolResultOf,
  readAll,
  textOf,
} from "../harness"
import { imageApp } from "../sample"

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

function rigFor(generation: Generation, withApp: "with" | "without"): AgentRig {
  const apps = withApp === "with" ? [imageApp()] : []
  rig = agentFor(appToolsFor(apps, generation))
  return rig
}

describe("an app tool built from its catalog definition", () => {
  it("starts one run with the inputs the model sends and the idempotency key it keeps", async () => {
    const generation = generationFor([imageApp()])
    const { agent, faux } = rigFor(generation, "with")
    faux.setResponses([
      fauxAssistantMessage(
        [fauxToolCall("sample-image", { inputs: { prompt: "a red rose" } })],
        { stopReason: "toolUse" }
      ),
      (context) => fauxAssistantMessage(textOf(lastToolResultOf(context))),
    ])
    const { id } = await agent.startConversation({ runApproval: "auto" })

    const events = await readAll(
      await agent.send({ conversationId: id, text: "Make a red rose" })
    )

    expect(generation.runs.count).toBe(1)
    const [runId] = generation.jobs.enqueued
    const run = await generation.runs.get(runId!)
    expect(run?.toRecord().inputs).toEqual({
      prompt: "a red rose",
      references: [],
    })
    expect(run?.idempotencyKey).toMatch(/^agent-[0-9a-f-]{36}$/)
    expect(events).toContainEqual({ type: "run", runId })
    expect(lastMessageOf(events)).toContain(runId)
    const indexes = events.flatMap((event) =>
      event.type === "message" ? [event.index] : []
    )
    expect(new Set(indexes)).toEqual(new Set([0]))
    expect(events.at(-1)).toEqual({ type: "done" })
  })

  it("refuses arguments outside the app's schema without starting a run", async () => {
    const generation = generationFor([imageApp()])
    const { agent, faux } = rigFor(generation, "with")
    faux.setResponses([
      fauxAssistantMessage(
        [fauxToolCall("sample-image", { inputs: { prompt: "rose", size: 9 } })],
        { stopReason: "toolUse" }
      ),
      (context) => {
        const result = lastToolResultOf(context)
        return fauxAssistantMessage(result?.isError ? "refused" : "started")
      },
    ])
    const { id } = await agent.startConversation({ runApproval: "auto" })

    const events = await readAll(
      await agent.send({ conversationId: id, text: "Make a rose" })
    )

    expect(generation.runs.count).toBe(0)
    expect(lastMessageOf(events)).toBe("refused")
  })

  it("offers the model the app's inputs as JSON Schema, which pi applies before the run starts", async () => {
    const generation = generationFor([imageApp()])
    const { agent, faux } = rigFor(generation, "with")
    const offered: unknown[] = []
    faux.setResponses([
      (context) => {
        offered.push(...getCurrentTools(context.messages))
        return fauxAssistantMessage(
          [
            fauxToolCall("sample-image", {
              inputs: { prompt: "a red rose" },
              count: "2",
            }),
          ],
          { stopReason: "toolUse" }
        )
      },
      fauxAssistantMessage("started"),
    ])
    const { id } = await agent.startConversation({ runApproval: "auto" })

    await readAll(await agent.send({ conversationId: id, text: "Two roses" }))

    expect(offered).toContainEqual(
      expect.objectContaining({
        name: "sample-image",
        parameters: expect.objectContaining({
          type: "object",
          required: ["inputs"],
          additionalProperties: false,
        }),
      })
    )
    expect(JSON.stringify(offered)).not.toContain("$schema")
    const [runId] = generation.jobs.enqueued
    expect((await generation.runs.get(runId!))?.toRecord().count).toBe(2)
  })

  it("control: with the app absent from the catalog, the model's call reaches no tool and starts no run", async () => {
    const generation = generationFor([imageApp()])
    const { agent, faux } = rigFor(generation, "without")
    faux.setResponses([
      fauxAssistantMessage(
        [fauxToolCall("sample-image", { inputs: { prompt: "a red rose" } })],
        { stopReason: "toolUse" }
      ),
      (context) => {
        const result = lastToolResultOf(context)
        return fauxAssistantMessage(result?.isError ? "no tool" : "started")
      },
    ])
    const { id } = await agent.startConversation({ runApproval: "auto" })

    const events = await readAll(
      await agent.send({ conversationId: id, text: "Make a red rose" })
    )

    expect(generation.runs.count).toBe(0)
    expect(generation.jobs.enqueued).toEqual([])
    expect(events.some((event) => event.type === "run")).toBe(false)
    expect(lastMessageOf(events)).toBe("no tool")
    expect(events.at(-1)).toEqual({ type: "done" })
  })

  it("streams the agent's text as it grows", async () => {
    const generation = generationFor([])
    const { agent, faux } = rigFor(generation, "without")
    faux.setResponses([fauxAssistantMessage([fauxText("Two words")])])
    const { id } = await agent.startConversation({ runApproval: "auto" })

    const events = await readAll(
      await agent.send({ conversationId: id, text: "Say two words" })
    )

    const messages = events.filter((event) => event.type === "message")
    expect(messages.length).toBeGreaterThan(0)
    expect(messages.every((event) => event.index === 0)).toBe(true)
    expect(lastMessageOf(events)).toBe("Two words")
  })
})
