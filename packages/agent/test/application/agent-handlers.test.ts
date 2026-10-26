import { InvalidIdError } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { Conversation } from "#agent.contract"
import { AcceptProposalHandler } from "#application/accept-proposal/accept-proposal.handler"
import { ChooseAgentModelHandler } from "#application/choose-agent-model/choose-agent-model.handler"
import { DeleteConversationHandler } from "#application/delete-conversation/delete-conversation.handler"
import { ListAgentModelsHandler } from "#application/list-agent-models/list-agent-models.handler"
import { ListConversationsHandler } from "#application/list-conversations/list-conversations.handler"
import { ReadConversationHandler } from "#application/read-conversation/read-conversation.handler"
import { SendMessageHandler } from "#application/send-message/send-message.handler"
import { SkipProposalHandler } from "#application/skip-proposal/skip-proposal.handler"
import { StartConversationHandler } from "#application/start-conversation/start-conversation.handler"
import { UpdateConversationHandler } from "#application/update-conversation/update-conversation.handler"
import { conversationIdFormat } from "#domain/conversation.id"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"
import { AgentModelUnknownError } from "#domain/error/agent-model-unknown.error"
import { ConversationNotFoundError } from "#domain/error/conversation-not-found.error"
import { ProposalSettledError } from "#domain/error/proposal-settled.error"
import { proposalIdFormat } from "#domain/proposal.id"
import { FakeAgentHarness } from "../fake/fake-agent-harness"
import { generationFor, proposalRunnerFor, readAll } from "../harness"
import { imageApp, start } from "../sample"

const conversation: Conversation = {
  id: conversationIdFormat.parse("5d0c7a3e-9b1f-4e2a-8c6d-3f4a5b6c7d8e"),
  title: null,
  runApproval: "ask",
  createdAt: start.toISOString(),
}

const proposalId = proposalIdFormat.parse(
  "3a4b5c6d-7e8f-4a1b-8c2d-3e4f5a6b7c8d"
)

function fakeAgent(): FakeAgentHarness {
  return new FakeAgentHarness(conversation, [
    { type: "message", index: 0, text: "Hello" },
    { type: "done" },
  ])
}

async function agentWithProposal(): Promise<FakeAgentHarness> {
  const agent = fakeAgent()
  await agent.startConversation({ runApproval: "ask" })
  agent.proposals.set(proposalId, {
    proposal: {
      id: proposalId,
      appId: imageApp().id,
      request: { inputs: { prompt: "a rose" }, count: 1, aspectRatio: "1:1" },
      status: "proposed",
      runIds: [],
    },
    body: { inputs: { prompt: "a rose" } },
  })
  return agent
}

const ref = { conversationId: conversation.id, proposalId }

describe("the agent's handlers", () => {
  it("answer that a model is needed when the server has no model", async () => {
    const generation = generationFor([imageApp()])
    const refusals = await Promise.allSettled([
      new StartConversationHandler({ agent: null }).execute({
        runApproval: null,
      }),
      new ListConversationsHandler({ agent: null }).execute(),
      new ReadConversationHandler({ agent: null }).execute(ref),
      new UpdateConversationHandler({ agent: null }).execute({
        conversationId: conversation.id,
        changes: { title: "Roses" },
      }),
      new DeleteConversationHandler({ agent: null }).execute(ref),
      new SendMessageHandler({ agent: null }).execute({
        conversationId: conversation.id,
        text: "Hi",
      }),
      new AcceptProposalHandler({
        agent: null,
        runner: proposalRunnerFor(generation),
      }).execute(ref),
      new SkipProposalHandler({ agent: null }).execute(ref),
      new ListAgentModelsHandler({ agent: null }).execute(),
      new ChooseAgentModelHandler({ agent: null }).execute({
        model: "maker/chat-large",
      }),
    ])

    expect(refusals).toHaveLength(10)
    for (const refusal of refusals) {
      expect(refusal.status).toBe("rejected")
      const reason = refusal.status === "rejected" ? refusal.reason : null
      expect(reason).toBeInstanceOf(AgentModelMissingError)
      expect(reason).toMatchObject({ code: "AGENT_MODEL_MISSING", status: 412 })
    }
    expect(generation.runs.count).toBe(0)
  })

  it("list the agent's models and change the one it answers with", async () => {
    const agent = fakeAgent()

    const before = await new ListAgentModelsHandler({ agent }).execute()
    const chosen = await new ChooseAgentModelHandler({ agent }).execute({
      model: "maker/chat-large",
    })

    expect(before).toEqual({
      models: ["maker/chat-small", "maker/chat-large"],
      model: "maker/chat-small",
      recent: ["maker/chat-small"],
    })
    expect(chosen.model).toBe("maker/chat-large")
    expect(chosen.recent).toEqual(["maker/chat-large", "maker/chat-small"])
    await expect(
      new ChooseAgentModelHandler({ agent }).execute({ model: "maker/other" })
    ).rejects.toBeInstanceOf(AgentModelUnknownError)
    expect((await agent.listModels()).model).toBe("maker/chat-large")
  })

  it("start a conversation on auto unless told to ask before each run", async () => {
    const agent = fakeAgent()
    const handler = new StartConversationHandler({ agent })

    const unsaid = await handler.execute({ runApproval: null })
    const asking = await handler.execute({ runApproval: "ask" })

    expect(unsaid.conversation.runApproval).toBe("auto")
    expect(asking.conversation.runApproval).toBe("ask")
  })

  it("list, read, rename and delete a conversation", async () => {
    const agent = fakeAgent()
    await new StartConversationHandler({ agent }).execute({ runApproval: null })

    const listed = await new ListConversationsHandler({ agent }).execute()
    const read = await new ReadConversationHandler({ agent }).execute(ref)
    const renamed = await new UpdateConversationHandler({ agent }).execute({
      conversationId: conversation.id,
      changes: { title: "Roses", runApproval: "auto" },
    })
    await new DeleteConversationHandler({ agent }).execute(ref)

    expect(listed.conversations.map((one) => one.id)).toEqual([conversation.id])
    expect(read.conversation.id).toBe(conversation.id)
    expect(renamed.conversation).toMatchObject({
      title: "Roses",
      runApproval: "auto",
    })
    expect(agent.conversations.size).toBe(0)
    await expect(
      new ReadConversationHandler({ agent }).execute(ref)
    ).rejects.toThrow(ConversationNotFoundError)
  })

  it("send a message to the conversation it names and return its answer", async () => {
    const agent = fakeAgent()
    const handler = new SendMessageHandler({ agent })

    const { answer } = await handler.execute({
      conversationId: conversation.id,
      text: "Hi",
    })

    expect(agent.sent).toEqual([
      { conversationId: conversation.id, text: "Hi" },
    ])
    expect(await readAll(answer)).toEqual([
      { type: "message", index: 0, text: "Hello" },
      { type: "done" },
    ])
  })

  it("refuse a conversation id that is not a uuid before the agent sees it", async () => {
    const agent = fakeAgent()
    const handler = new SendMessageHandler({ agent })

    await expect(
      handler.execute({ conversationId: "../root", text: "Hi" })
    ).rejects.toThrow(InvalidIdError)
    expect(agent.sent).toEqual([])
  })

  it("start the proposed run once with the body the agent proposed, on accept", async () => {
    const agent = await agentWithProposal()
    const generation = generationFor([imageApp()])
    const accept = new AcceptProposalHandler({
      agent,
      runner: proposalRunnerFor(generation),
    })

    const first = await accept.execute(ref)
    const again = await accept.execute(ref)

    const [run] = first.runs
    expect(first.runs).toHaveLength(1)
    expect(first.proposal).toMatchObject({
      status: "accepted",
      runIds: [run?.id],
    })
    expect(run?.inputs).toMatchObject({ prompt: "a rose" })
    expect(again.runs.map((one) => one.id)).toEqual([run?.id])
    expect(generation.runs.count).toBe(1)
    expect(generation.jobs.enqueued).toEqual([run?.id])
    expect(agent.decisions).toEqual([{ status: "accepted", runIds: [run?.id] }])
  })

  it("skip a proposal without starting a run, and refuse to accept it after", async () => {
    const agent = await agentWithProposal()
    const generation = generationFor([imageApp()])

    const { proposal } = await new SkipProposalHandler({ agent }).execute(ref)

    expect(proposal.status).toBe("skipped")
    await expect(
      new AcceptProposalHandler({
        agent,
        runner: proposalRunnerFor(generation),
      }).execute(ref)
    ).rejects.toThrow(ProposalSettledError)
    expect(generation.runs.count).toBe(0)
  })

  it("refuse to skip a proposal you accepted", async () => {
    const agent = await agentWithProposal()
    const generation = generationFor([imageApp()])
    await new AcceptProposalHandler({
      agent,
      runner: proposalRunnerFor(generation),
    }).execute(ref)

    await expect(
      new SkipProposalHandler({ agent }).execute(ref)
    ).rejects.toThrow(ProposalSettledError)
    expect(agent.decisions).toEqual([
      { status: "accepted", runIds: generation.jobs.enqueued },
    ])
  })
})
