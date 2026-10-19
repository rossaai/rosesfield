import { afterEach, describe, expect, it } from "vitest"
import {
  acceptProposal,
  readConversationList,
  readTranscript,
  updateConversation,
} from "@/api/conversation-wire"
import { GatewayRefusedError } from "@/api/gateway-refused.error"

const conversationId = "2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d"
const proposalId = "4c5d6e7f-8091-4a2b-8c3d-4e5f6a7b8c9d"
const runId = "3b4c5d6e-7f80-4a9b-8c1d-2e3f4a5b6c7d"
const createdAt = "2026-10-17T09:00:00.000Z"
const realFetch = globalThis.fetch

const conversation = {
  id: conversationId,
  title: "A red bicycle",
  runApproval: "ask",
  createdAt,
}

const proposal = {
  id: proposalId,
  appId: "image",
  request: { inputs: { prompt: "A red bicycle" }, count: 2, aspectRatio: null },
  status: "proposed",
  runId: null,
}

const run = {
  id: runId,
  appId: "image",
  status: "queued",
  inputs: { prompt: "A red bicycle" },
  count: 2,
  aspectRatio: null,
  seed: null,
  outputs: [],
  progress: null,
  engine: { adapter: "demo", models: [], workflowHash: null },
  cost: null,
  origin: "demo",
  failure: null,
  createdAt,
  finishedAt: null,
}

type Sent = { url: string; init: RequestInit | undefined }

function answerWith(response: Response): Sent[] {
  const sent: Sent[] = []
  globalThis.fetch = async (input, init) => {
    sent.push({ url: String(input), init })
    return response
  }
  return sent
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe("readTranscript", () => {
  it("reads each kind of item the gateway keeps", () => {
    const read = readTranscript({
      conversation,
      items: [
        { type: "person", text: "Make a red bicycle" },
        { type: "agent", text: "I will run Image." },
        { type: "run", runId },
        { type: "proposal", proposal },
      ],
    })
    expect(read?.conversation).toEqual(conversation)
    expect(read?.items.map((item) => item.type)).toEqual([
      "person",
      "agent",
      "run",
      "proposal",
    ])
    expect(read?.items[3]).toEqual({
      type: "proposal",
      proposal: { ...proposal, request: { ...proposal.request } },
    })
  })

  it("refuses a transcript with one item it cannot read", () => {
    expect(
      readTranscript({
        conversation,
        items: [
          { type: "proposal", proposal: { ...proposal, status: "open" } },
        ],
      })
    ).toBeNull()
    expect(
      readTranscript({ conversation: { ...conversation, id: "" }, items: [] })
    ).toBeNull()
  })
})

describe("readConversationList", () => {
  it("reads an untitled conversation as one with no title", () => {
    expect(
      readConversationList({
        conversations: [{ ...conversation, title: null }],
      })
    ).toEqual([{ ...conversation, title: null }])
    expect(
      readConversationList({
        conversations: [{ ...conversation, runApproval: "sometimes" }],
      })
    ).toBeNull()
  })
})

describe("the conversation calls", () => {
  it("sends a rename as a PATCH with the new title", async () => {
    const sent = answerWith(
      Response.json({ conversation: { ...conversation, title: "Bicycles" } })
    )
    const renamed = await updateConversation(conversationId, {
      title: "Bicycles",
    })
    expect(renamed.title).toBe("Bicycles")
    expect(sent[0]?.url).toBe(`/api/agent/conversations/${conversationId}`)
    expect(sent[0]?.init?.method).toBe("PATCH")
    expect(sent[0]?.init?.body).toBe(JSON.stringify({ title: "Bicycles" }))
  })

  it("accepts a proposal and reads the run it started", async () => {
    const sent = answerWith(
      Response.json(
        { proposal: { ...proposal, status: "accepted", runId }, run },
        { status: 202 }
      )
    )
    const accepted = await acceptProposal(conversationId, proposalId)
    expect(sent[0]?.url).toBe(
      `/api/agent/conversations/${conversationId}/proposals/${proposalId}/accept`
    )
    expect(accepted.proposal.status).toBe("accepted")
    expect(accepted.run.id).toBe(runId)
  })

  it("turns an answer it cannot read into a refusal", async () => {
    answerWith(Response.json({ proposal: { ...proposal, status: "accepted" } }))
    await expect(
      acceptProposal(conversationId, proposalId)
    ).rejects.toMatchObject({
      constructor: GatewayRefusedError,
      code: "RESPONSE_INVALID",
    })
  })
})
