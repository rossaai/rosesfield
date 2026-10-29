import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai"
import { afterEach, describe, expect, it } from "vitest"
import type { AnswerEvent, Proposal } from "#agent.contract"
import { AcceptProposalHandler } from "#application/accept-proposal/accept-proposal.handler"
import { SkipProposalHandler } from "#application/skip-proposal/skip-proposal.handler"
import { proposalRecords } from "#infrastructure/pi-conversation-docs"
import {
  type AgentRig,
  agentFor,
  appToolsFor,
  type Generation,
  generationFor,
  lastMessageOf,
  proposalRunnerFor,
  readAll,
} from "../harness"
import { imageApp } from "../sample"

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

function proposalOf(events: readonly AnswerEvent[]): Proposal {
  const found = events.find((event) => event.type === "proposal")
  if (found?.type !== "proposal") {
    throw new Error("The answer holds no proposal")
  }
  return found.proposal
}

async function proposeRose(generation: Generation) {
  rig = agentFor(appToolsFor([imageApp()], generation))
  rig.faux.setResponses([
    fauxAssistantMessage(
      [
        fauxToolCall("sample-image", {
          inputs: { prompt: "a red rose" },
          count: 2,
        }),
      ],
      { stopReason: "toolUse" }
    ),
    fauxAssistantMessage("This answer is never asked for."),
  ])
  const { id } = await rig.agent.startConversation({ runApproval: "ask" })
  const events = await readAll(
    await rig.agent.send({ conversationId: id, text: "Two red roses" })
  )
  return { rig, id, events }
}

describe("a conversation that asks before each run", () => {
  it("proposes the run, starts none, and ends the answer for your decision", async () => {
    const generation = generationFor([imageApp()])

    const { events } = await proposeRose(generation)

    expect(generation.runs.count).toBe(0)
    expect(proposalOf(events)).toMatchObject({
      appId: "sample-image",
      status: "proposed",
      runIds: [],
      request: { inputs: { prompt: "a red rose" }, count: 2 },
    })
    expect(events.some((event) => event.type === "run")).toBe(false)
    expect(lastMessageOf(events)).toBe("")
    expect(events.at(-1)).toEqual({ type: "done" })
  })

  it("starts the proposed run when you accept it, and tells the agent", async () => {
    const generation = generationFor([imageApp()])
    const { rig, id, events } = await proposeRose(generation)
    const proposal = proposalOf(events)
    let told = ""
    rig.faux.setResponses([
      (context) => {
        const notes = context.messages.filter(
          (message) =>
            message.role === "user" &&
            typeof message.content === "string" &&
            message.content.startsWith("I accepted")
        )
        told = notes.length === 1 ? String(notes[0]?.content) : ""
        return fauxAssistantMessage("Noted.")
      },
    ])

    const accepted = await new AcceptProposalHandler({
      agent: rig.agent,
      runner: proposalRunnerFor(generation),
    }).execute({ conversationId: id, proposalId: proposal.id })
    await readAll(await rig.agent.send({ conversationId: id, text: "Thanks" }))

    const runIds = accepted.runs.map((run) => run.id)
    expect(generation.runs.count).toBe(1)
    expect(accepted.runs).toHaveLength(1)
    expect(accepted.runs[0]).toMatchObject({
      appId: "sample-image",
      count: 2,
      inputs: { prompt: "a red rose" },
    })
    expect(told).toContain(proposal.id)
    expect(told).toContain(runIds[0])
    const { items } = await rig.agent.readConversation(id)
    expect(items).toContainEqual({
      type: "proposal",
      proposal: { ...proposal, status: "accepted", runIds },
    })
  })

  it("starts nothing when you skip the proposal, and shows it skipped", async () => {
    const generation = generationFor([imageApp()])
    const { rig, id, events } = await proposeRose(generation)
    const proposal = proposalOf(events)

    const skipped = await new SkipProposalHandler({ agent: rig.agent }).execute(
      { conversationId: id, proposalId: proposal.id }
    )

    expect(skipped.proposal.status).toBe("skipped")
    expect(generation.runs.count).toBe(0)
    const { items } = await rig.agent.readConversation(id)
    expect(items).toContainEqual({
      type: "proposal",
      proposal: { ...proposal, status: "skipped" },
    })
  })

  it("refuses a proposal whose inputs break the app's rules", async () => {
    const generation = generationFor([imageApp()])
    rig = agentFor(appToolsFor([imageApp()], generation))
    rig.faux.setResponses([
      fauxAssistantMessage(
        [fauxToolCall("sample-image", { inputs: { prompt: " " } })],
        { stopReason: "toolUse" }
      ),
      fauxAssistantMessage("I need a prompt."),
    ])
    const { id } = await rig.agent.startConversation({ runApproval: "ask" })

    const events = await readAll(
      await rig.agent.send({ conversationId: id, text: "Make something" })
    )

    expect(events.some((event) => event.type === "proposal")).toBe(false)
    expect(lastMessageOf(events)).toBe("I need a prompt.")
  })

  it("reads a proposal stored with one run id as a list of that run", () => {
    const stored = {
      id: "3a4b5c6d-7e8f-4a1b-8c2d-3e4f5a6b7c8d",
      appId: "sample-image",
      request: { inputs: { prompt: "a rose" }, count: 1, aspectRatio: null },
      body: {},
      status: "accepted",
      runId: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
    }
    const migrate = proposalRecords.definition.migrate
    expect(migrate?.(stored, 1)).toEqual({
      id: stored.id,
      appId: stored.appId,
      request: stored.request,
      body: {},
      status: "accepted",
      runIds: [stored.runId],
      credits: null,
    })
    expect(
      migrate?.({ ...stored, status: "proposed", runId: null }, 1)
    ).toMatchObject({ status: "proposed", runIds: [] })
  })

  it("reads a proposal stored with its run ids before it held the credits of a final, with no credits", () => {
    const { runId, ...stored } = {
      id: "3a4b5c6d-7e8f-4a1b-8c2d-3e4f5a6b7c8d",
      appId: "sample-image",
      request: { inputs: { prompt: "a rose" }, count: 1, aspectRatio: null },
      body: {},
      status: "accepted" as const,
      runId: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
    }
    const migrate = proposalRecords.definition.migrate
    expect(migrate?.({ ...stored, runIds: [runId] }, 2)).toEqual({
      ...stored,
      runIds: [runId],
      credits: null,
    })
  })
})
