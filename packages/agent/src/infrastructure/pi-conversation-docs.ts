import {
  defineDoc,
  defineDocFamily,
  type Harness,
  type JsonObject,
  type ConversationId as PiConversationId,
} from "@earendil-works/pi-durable"
import { type RunInputs, runRequest } from "@rosesfield/contract"
import { z } from "zod"
import {
  type AgentEffort,
  type Conversation,
  type ProposalStatus,
  proposalStatus,
  type RunApproval,
} from "#agent.contract"
import { StartConversationHandler } from "#application/start-conversation/start-conversation.handler"
import { conversationIdFormat } from "#domain/conversation.id"
import { backgroundContext } from "#infrastructure/pi-context"

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
  effort?: AgentEffort
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
  runIds: string[]
  /** The credits a chain's final costs, priced by the agent, or null when one run's price is the proposal's. */
  credits: number | null
}

const proposalRecordBase = z.object({
  id: z.string(),
  appId: z.string(),
  request: runRequest,
  body: z.record(z.string(), z.json()),
  status: proposalStatus,
})

const proposalRecordOne = proposalRecordBase.extend({
  runId: z.string().nullable(),
})

const proposalRecordTwo = proposalRecordBase.extend({
  runIds: z.array(z.string()),
})

/** Reads a proposal kept before it held the credits of a final: the first kept one run id, the second its run ids. */
function proposalRecordOf(value: JsonObject): ProposalRecord {
  const two = proposalRecordTwo.safeParse(value)
  if (two.success) {
    return { ...two.data, credits: null }
  }
  const { runId, ...record } = proposalRecordOne.parse(value)
  return { ...record, runIds: runId === null ? [] : [runId], credits: null }
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
  initial: () => ({ runApproval: StartConversationHandler.runApproval }),
})

export const proposalRecords = defineDocFamily<ProposalRecord, ProposalRecord>({
  kind: "rosesfield.proposal",
  version: 3,
  scope: "conversation",
  history: "latest",
  fork: "current",
  family: true,
  initial: (seed) => ({ ...seed }),
  migrate: proposalRecordOf,
})

export async function conversationOf(
  harness: Harness,
  id: string,
  listed: ListedConversation
): Promise<Conversation> {
  const settings = await harness.snapshot(
    conversationSettings,
    listed.conversation,
    backgroundContext
  )
  return {
    id: conversationIdFormat.parse(id),
    title: listed.title,
    runApproval: settings?.runApproval ?? StartConversationHandler.runApproval,
    ...(settings?.effort === undefined ? {} : { effort: settings.effort }),
    createdAt: listed.createdAt,
  }
}
