import {
  buildPath,
  type Run,
  type RunRequest,
  run,
  runRequest,
} from "@rosesfield/contract"
import { callPath, callPathFor, fieldOf, oneOf } from "@/api/call-path"

export type RunApproval = "ask" | "auto"

export type Conversation = {
  id: string
  title: string | null
  runApproval: RunApproval
  createdAt: string
}

export type ProposalStatus = "proposed" | "accepted" | "skipped"

export type Proposal = {
  id: string
  appId: string
  request: RunRequest
  status: ProposalStatus
  runId: string | null
}

export type TranscriptItem =
  | { type: "person"; text: string }
  | { type: "agent"; text: string }
  | { type: "run"; runId: string }
  | { type: "proposal"; proposal: Proposal }

export type Transcript = {
  conversation: Conversation
  items: TranscriptItem[]
}

export type ConversationChanges = {
  title?: string
  runApproval?: RunApproval
}

const listPath = "/api/agent/conversations"
const itemPath = "/api/agent/conversations/:conversationId"
const proposalPath =
  "/api/agent/conversations/:conversationId/proposals/:proposalId/:act"

function textOf(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null
}

export function readConversationOf(value: unknown): Conversation | null {
  const id = textOf(fieldOf(value, "id"))
  const title = fieldOf(value, "title")
  const runApproval = oneOf(fieldOf(value, "runApproval"), ["ask", "auto"])
  const createdAt = textOf(fieldOf(value, "createdAt"))
  if (
    id === null ||
    runApproval === null ||
    createdAt === null ||
    (title !== null && typeof title !== "string")
  ) {
    return null
  }
  return { id, title: title === "" ? null : title, runApproval, createdAt }
}

export function readProposal(value: unknown): Proposal | null {
  const id = textOf(fieldOf(value, "id"))
  const appId = textOf(fieldOf(value, "appId"))
  const request = runRequest.safeParse(fieldOf(value, "request"))
  const status = oneOf(fieldOf(value, "status"), [
    "proposed",
    "accepted",
    "skipped",
  ])
  const runId = fieldOf(value, "runId")
  if (id === null || appId === null || !request.success || status === null) {
    return null
  }
  if (runId !== null && textOf(runId) === null) {
    return null
  }
  return { id, appId, request: request.data, status, runId: textOf(runId) }
}

function readItem(value: unknown): TranscriptItem | null {
  const type = fieldOf(value, "type")
  const text = fieldOf(value, "text")
  if ((type === "person" || type === "agent") && typeof text === "string") {
    return { type, text }
  }
  const runId = textOf(fieldOf(value, "runId"))
  if (type === "run" && runId !== null) {
    return { type, runId }
  }
  const proposal = readProposal(fieldOf(value, "proposal"))
  return type === "proposal" && proposal !== null ? { type, proposal } : null
}

function listOf<Item>(
  value: unknown,
  read: (item: unknown) => Item | null
): Item[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const items = value.map(read)
  return items.every((item): item is Item => item !== null) ? items : null
}

export function readConversationList(body: unknown): Conversation[] | null {
  return listOf(fieldOf(body, "conversations"), readConversationOf)
}

export function readTranscript(body: unknown): Transcript | null {
  const conversation = readConversationOf(fieldOf(body, "conversation"))
  const items = listOf(fieldOf(body, "items"), readItem)
  return conversation === null || items === null
    ? null
    : { conversation, items }
}

function conversationIn(body: unknown): Conversation | null {
  return readConversationOf(fieldOf(body, "conversation"))
}

export function listConversations(
  signal?: AbortSignal
): Promise<Conversation[]> {
  return callPathFor(
    { method: "GET", path: listPath, signal },
    readConversationList
  )
}

export function startConversation(
  runApproval: RunApproval
): Promise<Conversation> {
  return callPathFor(
    { method: "POST", path: listPath, body: { runApproval } },
    conversationIn
  )
}

export function readConversation(
  conversationId: string,
  signal?: AbortSignal
): Promise<Transcript> {
  const path = buildPath(itemPath, { conversationId })
  return callPathFor({ method: "GET", path, signal }, readTranscript)
}

export function updateConversation(
  conversationId: string,
  changes: ConversationChanges
): Promise<Conversation> {
  const path = buildPath(itemPath, { conversationId })
  return callPathFor({ method: "PATCH", path, body: changes }, conversationIn)
}

export async function deleteConversation(
  conversationId: string
): Promise<void> {
  const path = buildPath(itemPath, { conversationId })
  await callPath({ method: "DELETE", path })
}

function acceptedOf(body: unknown): { proposal: Proposal; run: Run } | null {
  const proposal = readProposal(fieldOf(body, "proposal"))
  const started = run.safeParse(fieldOf(body, "run"))
  return proposal === null || !started.success
    ? null
    : { proposal, run: started.data }
}

export function acceptProposal(
  conversationId: string,
  proposalId: string
): Promise<{ proposal: Proposal; run: Run }> {
  const path = buildPath(proposalPath, {
    conversationId,
    proposalId,
    act: "accept",
  })
  return callPathFor({ method: "POST", path }, acceptedOf)
}

export function skipProposal(
  conversationId: string,
  proposalId: string
): Promise<Proposal> {
  const path = buildPath(proposalPath, {
    conversationId,
    proposalId,
    act: "skip",
  })
  return callPathFor({ method: "POST", path }, (body) =>
    readProposal(fieldOf(body, "proposal"))
  )
}
