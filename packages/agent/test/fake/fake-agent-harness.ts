import type {
  AnswerEvent,
  Conversation,
  Proposal,
  Transcript,
} from "#agent.contract"
import {
  AgentHarness,
  type AgentMessage,
  type AgentModelChoice,
  type AnswerStream,
  type ConversationChanges,
  type NewConversation,
  type ProposalDecision,
  type ProposalRef,
  type StoredProposal,
} from "#domain/agent-harness.port"
import type { ConversationId } from "#domain/conversation.id"
import { AgentModelUnknownError } from "#domain/error/agent-model-unknown.error"
import { ConversationNotFoundError } from "#domain/error/conversation-not-found.error"
import { ProposalNotFoundError } from "#domain/error/proposal-not-found.error"

export class FakeAgentHarness extends AgentHarness {
  readonly sent: AgentMessage[] = []
  readonly decisions: ProposalDecision[] = []
  readonly conversations = new Map<string, Conversation>()
  readonly proposals = new Map<string, StoredProposal>()
  readonly models = ["maker/chat-small", "maker/chat-large"]
  private model = "maker/chat-small"
  private readonly next: Conversation
  private readonly answer: readonly AnswerEvent[]

  constructor(conversation: Conversation, answer: readonly AnswerEvent[]) {
    super()
    this.next = conversation
    this.answer = answer
  }

  override async startConversation(
    options: NewConversation
  ): Promise<Conversation> {
    const started = { ...this.next, runApproval: options.runApproval }
    this.conversations.set(started.id, started)
    return started
  }

  override async listConversations(): Promise<Conversation[]> {
    return [...this.conversations.values()]
  }

  override async readConversation(id: ConversationId): Promise<Transcript> {
    return { conversation: this.find(id), items: [] }
  }

  override async updateConversation(
    id: ConversationId,
    changes: ConversationChanges
  ): Promise<Conversation> {
    const current = this.find(id)
    const updated = {
      ...current,
      title: changes.title ?? current.title,
      runApproval: changes.runApproval ?? current.runApproval,
    }
    this.conversations.set(id, updated)
    return updated
  }

  override async deleteConversation(id: ConversationId): Promise<void> {
    this.find(id)
    this.conversations.delete(id)
  }

  override async send(message: AgentMessage): Promise<AnswerStream> {
    this.sent.push(message)
    const events = [...this.answer]
    return {
      [Symbol.asyncIterator]: async function* () {
        yield* events
      },
      stop: async () => undefined,
    }
  }

  override async listModels(): Promise<AgentModelChoice> {
    return { models: [...this.models], model: this.model }
  }

  override async chooseModel(model: string): Promise<AgentModelChoice> {
    if (!this.models.includes(model)) {
      throw new AgentModelUnknownError({ provider: "maker", model })
    }
    this.model = model
    return this.listModels()
  }

  override async readProposal(ref: ProposalRef): Promise<StoredProposal> {
    this.find(ref.conversationId)
    const stored = this.proposals.get(ref.proposalId)
    if (stored === undefined) {
      throw new ProposalNotFoundError({ proposalId: ref.proposalId })
    }
    return stored
  }

  override async settleProposal(
    ref: ProposalRef,
    decision: ProposalDecision
  ): Promise<Proposal> {
    const { proposal, body } = await this.readProposal(ref)
    this.decisions.push(decision)
    const settled: Proposal = {
      ...proposal,
      status: decision.status,
      runId: decision.status === "accepted" ? decision.runId : null,
    }
    this.proposals.set(ref.proposalId, { proposal: settled, body })
    return settled
  }

  private find(id: string): Conversation {
    const found = this.conversations.get(id)
    if (found === undefined) {
      throw new ConversationNotFoundError({ conversationId: id })
    }
    return found
  }
}
