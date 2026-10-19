import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai"
import { afterEach, describe, expect, it } from "vitest"
import type { AnswerEvent, Proposal } from "#agent.contract"
import { AcceptProposalHandler } from "#application/accept-proposal/accept-proposal.handler"
import { SkipProposalHandler } from "#application/skip-proposal/skip-proposal.handler"
import {
  type AgentRig,
  agentFor,
  appToolsFor,
  type Generation,
  generationFor,
  lastMessageOf,
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
      runId: null,
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
      startRun: generation.startRun,
    }).execute({ conversationId: id, proposalId: proposal.id })
    await readAll(await rig.agent.send({ conversationId: id, text: "Thanks" }))

    expect(generation.runs.count).toBe(1)
    expect(accepted.run).toMatchObject({
      appId: "sample-image",
      count: 2,
      inputs: { prompt: "a red rose" },
    })
    expect(told).toContain(proposal.id)
    expect(told).toContain(accepted.run.id)
    const { items } = await rig.agent.readConversation(id)
    expect(items).toContainEqual({
      type: "proposal",
      proposal: { ...proposal, status: "accepted", runId: accepted.run.id },
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
})
