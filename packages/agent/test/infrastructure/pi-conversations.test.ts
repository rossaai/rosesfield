import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai"
import { afterEach, describe, expect, it } from "vitest"
import { conversationIdFormat } from "#domain/conversation.id"
import { ConversationNotFoundError } from "#domain/error/conversation-not-found.error"
import {
  type AgentRig,
  agentFor,
  appToolsFor,
  generationFor,
  readAll,
} from "../harness"
import { imageApp } from "../sample"

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

describe("the agent's conversations over a SQLite file", () => {
  it("lists conversations newest first, each titled by its first message", async () => {
    rig = agentFor([])
    const { agent, faux } = rig
    faux.setResponses([fauxAssistantMessage("ok"), fauxAssistantMessage("ok")])
    const first = await agent.startConversation({ runApproval: "ask" })
    const second = await agent.startConversation({ runApproval: "auto" })
    await readAll(
      await agent.send({
        conversationId: second.id,
        text: "  Make a poster of roses\nwith a blue sky",
      })
    )
    await readAll(
      await agent.send({ conversationId: second.id, text: "Now a second one" })
    )

    const listed = await agent.listConversations()

    expect(listed.map((one) => one.id).sort()).toEqual(
      [first.id, second.id].sort()
    )
    expect(listed.find((one) => one.id === second.id)).toEqual({
      ...second,
      title: "Make a poster of roses",
    })
    expect(listed.find((one) => one.id === first.id)?.title).toBeNull()
  })

  it("renames a conversation and changes whether it asks before each run, and keeps both after a reopen", async () => {
    rig = agentFor([])
    const { id } = await rig.agent.startConversation({ runApproval: "ask" })

    const changed = await rig.agent.updateConversation(id, {
      title: "Roses",
      runApproval: "auto",
    })
    await rig.agent.close()
    const reopened = rig.reopen()

    expect(changed).toMatchObject({ title: "Roses", runApproval: "auto" })
    expect(await reopened.listConversations()).toEqual([changed])
  })

  it("deletes a conversation, which then reads as not found", async () => {
    rig = agentFor([])
    const kept = await rig.agent.startConversation({ runApproval: "ask" })
    const gone = await rig.agent.startConversation({ runApproval: "ask" })

    await rig.agent.deleteConversation(gone.id)

    expect((await rig.agent.listConversations()).map((one) => one.id)).toEqual([
      kept.id,
    ])
    await expect(rig.agent.readConversation(gone.id)).rejects.toThrow(
      ConversationNotFoundError
    )
    await expect(
      rig.agent.send({ conversationId: gone.id, text: "Hi" })
    ).rejects.toThrow(ConversationNotFoundError)
    await expect(
      rig.agent.deleteConversation(
        conversationIdFormat.parse(crypto.randomUUID())
      )
    ).rejects.toThrow(ConversationNotFoundError)
  })

  it("reads back your messages, the agent's answers and the runs it started", async () => {
    const generation = generationFor([imageApp()])
    rig = agentFor(appToolsFor([imageApp()], generation))
    rig.faux.setResponses([
      fauxAssistantMessage(
        [fauxToolCall("sample-image", { inputs: { prompt: "a red rose" } })],
        { stopReason: "toolUse" }
      ),
      fauxAssistantMessage("It is queued."),
    ])
    const { id } = await rig.agent.startConversation({ runApproval: "auto" })
    await readAll(
      await rig.agent.send({ conversationId: id, text: "Make a red rose" })
    )

    const { conversation, items } = await rig.agent.readConversation(id)

    const [runId] = generation.jobs.enqueued
    expect(conversation.id).toBe(id)
    expect(items).toEqual([
      { type: "person", text: "Make a red rose" },
      { type: "run", runId },
      { type: "agent", text: "It is queued." },
    ])
  })
})
