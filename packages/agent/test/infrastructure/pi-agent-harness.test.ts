import {
  type AssistantMessage,
  type FauxResponseStep,
  fauxAssistantMessage,
  getCurrentSystemPrompt,
} from "@earendil-works/pi-ai"
import { afterEach, describe, expect, it } from "vitest"
import { conversationIdFormat } from "#domain/conversation.id"
import { ConversationBusyError } from "#domain/error/conversation-busy.error"
import { ConversationNotFoundError } from "#domain/error/conversation-not-found.error"
import { type AgentRig, agentFor, lastMessageOf, readAll } from "../harness"
import { start } from "../sample"

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

type HeldAnswer = {
  step: FauxResponseStep
  asked: Promise<void>
  release: (text: string) => void
}

function heldAnswer(): HeldAnswer {
  let ask: () => void = () => undefined
  let answer: (message: AssistantMessage) => void = () => undefined
  const asked = new Promise<void>((resolve) => {
    ask = resolve
  })
  return {
    step: () =>
      new Promise<AssistantMessage>((resolve) => {
        answer = resolve
        ask()
      }),
    asked,
    release: (text) => answer(fauxAssistantMessage(text)),
  }
}

function emptyAgent(): AgentRig {
  rig = agentFor([])
  return rig
}

describe("the pi agent harness over a SQLite file", () => {
  it("starts a conversation with a uuid and the clock's time", async () => {
    const { agent } = emptyAgent()

    const conversation = await agent.startConversation({ runApproval: "ask" })

    expect(conversationIdFormat.is(conversation.id)).toBe(true)
    expect(conversation.createdAt).toBe(start.toISOString())
  })

  it("refuses a message to a conversation it does not hold", async () => {
    const { agent } = emptyAgent()
    const conversationId = conversationIdFormat.parse(crypto.randomUUID())

    await expect(agent.send({ conversationId, text: "Hi" })).rejects.toThrow(
      ConversationNotFoundError
    )
  })

  it("refuses a second message while the first one is answered, then takes it", async () => {
    const { agent, faux } = emptyAgent()
    const held = heldAnswer()
    faux.setResponses([held.step, fauxAssistantMessage("second")])
    const { id } = await agent.startConversation({ runApproval: "ask" })
    const first = await agent.send({ conversationId: id, text: "One" })
    await held.asked

    await expect(
      agent.send({ conversationId: id, text: "Two" })
    ).rejects.toThrow(ConversationBusyError)
    held.release("first")
    expect(lastMessageOf(await readAll(first))).toBe("first")
    const second = await agent.send({ conversationId: id, text: "Two" })
    expect(lastMessageOf(await readAll(second))).toBe("second")
  })

  it("ends the answer with a failure when the model fails", async () => {
    const { agent, faux } = emptyAgent()
    faux.setResponses([
      fauxAssistantMessage("", {
        stopReason: "error",
        errorMessage: "the provider refused the key",
      }),
    ])
    const { id } = await agent.startConversation({ runApproval: "ask" })

    const events = await readAll(
      await agent.send({ conversationId: id, text: "Hi" })
    )

    expect(events.at(-1)).toEqual({
      type: "failed",
      error: { code: "AGENT_ANSWER_FAILED", status: 502 },
    })
  })

  it("keeps a conversation and its messages when the file is opened again", async () => {
    const current = emptyAgent()
    current.faux.setResponses([
      fauxAssistantMessage("noted"),
      (context) => {
        const said = context.messages.some(
          (message) =>
            message.role === "user" && message.content === "My cat is Mora"
        )
        return fauxAssistantMessage(said ? "Mora" : "unknown")
      },
    ])
    const { id } = await current.agent.startConversation({ runApproval: "ask" })
    await readAll(
      await current.agent.send({ conversationId: id, text: "My cat is Mora" })
    )
    await current.agent.close()

    const reopened = current.reopen()
    const events = await readAll(
      await reopened.send({ conversationId: id, text: "Name my cat" })
    )

    expect(lastMessageOf(events)).toBe("Mora")
  })

  it("sends the model Rosesfield's instructions", async () => {
    const { agent, faux } = emptyAgent()
    let prompt = ""
    faux.setResponses([
      (context) => {
        prompt = getCurrentSystemPrompt(context.messages)
        return fauxAssistantMessage("ok")
      },
    ])
    const { id } = await agent.startConversation({ runApproval: "ask" })

    await readAll(await agent.send({ conversationId: id, text: "Hi" }))

    expect(prompt).toContain("You are the agent inside Rosesfield")
  })

  it("stops reading an answer at once while the agent keeps answering", async () => {
    const { agent, faux } = emptyAgent()
    const held = heldAnswer()
    faux.setResponses([held.step, fauxAssistantMessage("after")])
    const { id } = await agent.startConversation({ runApproval: "ask" })
    const answer = await agent.send({ conversationId: id, text: "One" })
    await held.asked

    const reading = readAll(answer)
    await answer.stop()
    expect(await reading).toEqual([])
    held.release("kept")
    await expect
      .poll(async () => {
        try {
          const next = await agent.send({ conversationId: id, text: "Two" })
          return lastMessageOf(await readAll(next))
        } catch (error) {
          return error instanceof ConversationBusyError ? "busy" : "error"
        }
      })
      .toBe("after")
  })
})
