import {
  appId,
  defineRoute,
  errorBody,
  run,
  runId,
  runRequest,
  timestamp,
} from "@rosesfield/contract"
import { z } from "zod"
import { conversationIdFormat } from "#domain/conversation.id"
import { proposalIdFormat } from "#domain/proposal.id"

export const conversationId = z
  .string()
  .regex(conversationIdFormat.pattern)
  .refine(conversationIdFormat.is)

export const proposalId = z
  .string()
  .regex(proposalIdFormat.pattern)
  .refine(proposalIdFormat.is)

export const runApproval = z.enum(["ask", "auto"])

export const conversationTitle = z.string().trim().min(1).max(120)

export const conversation = z.object({
  id: conversationId,
  title: z.string().max(120).nullable(),
  runApproval,
  createdAt: timestamp,
})

export const conversationResponse = z.object({ conversation })

export const conversationListResponse = z.object({
  conversations: z.array(conversation),
})

export const startConversationBody = z.strictObject({
  runApproval: runApproval.optional(),
})

export const updateConversationBody = z
  .strictObject({
    title: conversationTitle.optional(),
    runApproval: runApproval.optional(),
  })
  .refine(
    (body) => body.title !== undefined || body.runApproval !== undefined,
    {
      message: "needs a title or a runApproval",
    }
  )

export const sendMessageBody = z.strictObject({
  text: z.string().regex(/\S/).max(10_000),
})

export const proposalStatus = z.enum(["proposed", "accepted", "skipped"])

export const proposal = z.object({
  id: proposalId,
  appId,
  request: runRequest,
  status: proposalStatus,
  runIds: z.array(runId),
})

export const proposalResponse = z.object({ proposal })

export const acceptedProposalResponse = z.object({
  proposal,
  runs: z.array(run),
})

export const turnCredits = z.number().min(0)

export const agentModelId = z.string().min(1).max(200)

export const agentModelRate = z.object({
  input: z.number().min(0),
  output: z.number().min(0),
  turn: z.number().min(0),
})

export const agentModelsResponse = z.object({
  models: z.array(agentModelId),
  model: agentModelId.nullable(),
  recent: z.array(agentModelId).max(3).optional(),
  refusal: errorBody.nullable(),
  rates: z.record(agentModelId, agentModelRate).optional(),
})

export const chooseAgentModelBody = z.strictObject({ model: agentModelId })

export const answerEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    index: z.number().int().min(0),
    text: z.string(),
  }),
  z.object({ type: z.literal("run"), runId }),
  z.object({ type: z.literal("proposal"), proposal }),
  z.object({ type: z.literal("done"), credits: turnCredits.optional() }),
  z.object({ type: z.literal("failed"), error: errorBody }),
])

export const transcriptItem = z.discriminatedUnion("type", [
  z.object({ type: z.literal("person"), text: z.string() }),
  z.object({ type: z.literal("agent"), text: z.string() }),
  z.object({ type: z.literal("run"), runId }),
  z.object({ type: z.literal("proposal"), proposal }),
  z.object({ type: z.literal("credits"), credits: turnCredits }),
])

export const transcriptResponse = z.object({
  conversation,
  items: z.array(transcriptItem),
})

const conversationParams = z.object({ conversationId })

export const agentModelRoutes = {
  listAgentModels: defineRoute({
    method: "GET",
    path: "/api/agent/models",
    params: null,
    query: null,
    body: null,
    response: agentModelsResponse,
    status: 200,
  }),
  chooseAgentModel: defineRoute({
    method: "PATCH",
    path: "/api/agent/models",
    params: null,
    query: null,
    body: chooseAgentModelBody,
    response: agentModelsResponse,
    status: 200,
  }),
}
const proposalParams = z.object({ conversationId, proposalId })

export const conversationRoutes = {
  startConversation: defineRoute({
    method: "POST",
    path: "/api/agent/conversations",
    params: null,
    query: null,
    body: startConversationBody,
    response: conversationResponse,
    status: 201,
    spends: true,
  }),
  listConversations: defineRoute({
    method: "GET",
    path: "/api/agent/conversations",
    params: null,
    query: null,
    body: null,
    response: conversationListResponse,
    status: 200,
  }),
  readConversation: defineRoute({
    method: "GET",
    path: "/api/agent/conversations/:conversationId",
    params: conversationParams,
    query: null,
    body: null,
    response: transcriptResponse,
    status: 200,
  }),
  updateConversation: defineRoute({
    method: "PATCH",
    path: "/api/agent/conversations/:conversationId",
    params: conversationParams,
    query: null,
    body: updateConversationBody,
    response: conversationResponse,
    status: 200,
  }),
  deleteConversation: defineRoute({
    method: "DELETE",
    path: "/api/agent/conversations/:conversationId",
    params: conversationParams,
    query: null,
    body: null,
    response: null,
    status: 204,
  }),
  sendMessage: defineRoute({
    method: "POST",
    path: "/api/agent/conversations/:conversationId/messages",
    params: conversationParams,
    query: null,
    body: sendMessageBody,
    response: "bytes",
    status: 200,
    spends: true,
  }),
  acceptProposal: defineRoute({
    method: "POST",
    path: "/api/agent/conversations/:conversationId/proposals/:proposalId/accept",
    params: proposalParams,
    query: null,
    body: null,
    response: acceptedProposalResponse,
    status: 202,
    spends: true,
  }),
  skipProposal: defineRoute({
    method: "POST",
    path: "/api/agent/conversations/:conversationId/proposals/:proposalId/skip",
    params: proposalParams,
    query: null,
    body: null,
    response: proposalResponse,
    status: 200,
  }),
}

export type RunApproval = z.infer<typeof runApproval>
export type Conversation = z.infer<typeof conversation>
export type SendMessageBody = z.infer<typeof sendMessageBody>
export type UpdateConversationBody = z.infer<typeof updateConversationBody>
export type Proposal = z.infer<typeof proposal>
export type ProposalStatus = z.infer<typeof proposalStatus>
export type AnswerEvent = z.infer<typeof answerEvent>
export type TranscriptItem = z.infer<typeof transcriptItem>
export type Transcript = z.infer<typeof transcriptResponse>
export type AgentModels = z.infer<typeof agentModelsResponse>

export type AgentModelRate = z.infer<typeof agentModelRate>
