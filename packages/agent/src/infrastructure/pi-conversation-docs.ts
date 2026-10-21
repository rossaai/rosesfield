import {
  defineDoc,
  defineDocFamily,
  type JsonObject,
  type ConversationId as PiConversationId,
} from "@earendil-works/pi-durable"
import type { RunInputs } from "@rosesfield/contract"
import type { ProposalStatus, RunApproval } from "#agent.contract"

export type ListedConversation = {
  conversation: PiConversationId
  title: string | null
  createdAt: string
}

export type ConversationList = {
  items: Record<string, ListedConversation>
}

export type AgentSettings = {
  model: string | null
}

export type ConversationSettings = {
  runApproval: RunApproval
}

export type ProposalRecord = {
  id: string
  appId: string
  request: {
    inputs: RunInputs
    count: number
    aspectRatio: string | null
  }
  body: JsonObject
  status: ProposalStatus
  runId: string | null
}

export const conversationList = defineDoc<ConversationList>({
  kind: "rosesfield.conversations",
  version: 1,
  scope: "session",
  initial: () => ({ items: {} }),
})

export const agentSettings = defineDoc<AgentSettings>({
  kind: "rosesfield.agent-settings",
  version: 1,
  scope: "session",
  initial: () => ({ model: null }),
})

export const conversationSettings = defineDoc<ConversationSettings>({
  kind: "rosesfield.conversation-settings",
  version: 1,
  scope: "conversation",
  history: "latest",
  fork: "current",
  initial: () => ({ runApproval: "ask" }),
})

export const proposalRecords = defineDocFamily<ProposalRecord, ProposalRecord>({
  kind: "rosesfield.proposal",
  version: 1,
  scope: "conversation",
  history: "latest",
  fork: "current",
  family: true,
  initial: (seed) => ({ ...seed }),
})
