import type { RunId } from "@rosesfield/kernel"
import type {
  AgentEffort,
  AnswerEvent,
  Conversation,
  Proposal,
  RunApproval,
  Transcript,
} from "#agent.contract"
import type { ConversationId } from "#domain/conversation.id"
import type { ProposalId } from "#domain/proposal.id"

export type AgentMessage = {
  conversationId: ConversationId
  text: string
}

export type AnswerStream = AsyncIterable<AnswerEvent> & {
  stop(): Promise<void>
}

export type NewConversation = {
  runApproval: RunApproval
  effort?: AgentEffort | undefined
}

export type ConversationChanges = {
  title?: string | undefined
  runApproval?: RunApproval | undefined
  effort?: AgentEffort | undefined
}

export type ProposalRef = {
  conversationId: ConversationId
  proposalId: ProposalId
}

export type StoredProposal = {
  proposal: Proposal
  body: unknown
}

export type AgentModelChoice = {
  models: string[]
  model: string
}

export type ProposalDecision =
  | { status: "accepted"; runIds: RunId[] }
  | { status: "skipped" }

export abstract class AgentHarness {
  /** Starts a conversation with no messages and returns it. */
  abstract startConversation(options: NewConversation): Promise<Conversation>

  /** Lists every conversation, newest first. */
  abstract listConversations(): Promise<Conversation[]>

  /** Reads one conversation with its messages, runs and proposals. */
  abstract readConversation(id: ConversationId): Promise<Transcript>

  /** Renames a conversation, changes whether it asks before each run, or changes the effort its turns ask of the model. */
  abstract updateConversation(
    id: ConversationId,
    changes: ConversationChanges
  ): Promise<Conversation>

  /** Stops a conversation and removes it from the list. */
  abstract deleteConversation(id: ConversationId): Promise<void>

  /** Sends a message and returns the answer as it grows, until it ends. */
  abstract send(message: AgentMessage): Promise<AnswerStream>

  /** Reads one run the agent proposed, with the start-run body it holds. */
  abstract readProposal(ref: ProposalRef): Promise<StoredProposal>

  /** Lists the models the agent can answer with, the one it answers with now, and the last ones chosen, newest first. */
  abstract listModels(): Promise<AgentModelChoice>

  /** Makes the agent answer every next turn with one of the models it lists. */
  abstract chooseModel(model: string): Promise<AgentModelChoice>

  /** Records the person's decision on a proposal and tells the agent. */
  abstract settleProposal(
    ref: ProposalRef,
    decision: ProposalDecision
  ): Promise<Proposal>
}
