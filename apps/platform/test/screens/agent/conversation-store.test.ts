import { describe, expect, it } from "vitest"
import type { Proposal } from "@/api/conversation-wire"
import {
  changeLiveTurn,
  noteProposal,
  readLiveTurn,
  setLiveTurn,
  type Turn,
} from "@/screens/agent/conversation-store"

const conversationId = "conversation-live"

const proposal: Proposal = {
  id: "proposal-1",
  appId: "image",
  request: { inputs: { prompt: "A red bicycle" }, count: 1, aspectRatio: null },
  status: "proposed",
  runIds: [],
}

function turnOf(key: string): Turn {
  return {
    key,
    text: "Make a red bicycle",
    prompt: "Make a red bicycle",
    assetIds: [],
    characterIds: [],
    parts: [{ kind: "proposal", proposal }],
    status: "answering",
    failureCode: null,
    credits: null,
    shownItems: 0,
  }
}

describe("the live turn", () => {
  it("changes only the turn it was asked to change", () => {
    setLiveTurn(conversationId, turnOf("turn-2"))
    changeLiveTurn(conversationId, "turn-1", (turn) => ({
      ...turn,
      status: "done",
    }))
    expect(readLiveTurn(conversationId)?.status).toBe("answering")
    changeLiveTurn(conversationId, "turn-2", (turn) => ({
      ...turn,
      status: "done",
    }))
    expect(readLiveTurn(conversationId)?.status).toBe("done")
  })

  it("replaces a proposal with its answered state", () => {
    setLiveTurn(conversationId, turnOf("turn-3"))
    noteProposal(conversationId, {
      ...proposal,
      status: "accepted",
      runIds: ["run-1"],
    })
    expect(readLiveTurn(conversationId)?.parts).toEqual([
      {
        kind: "proposal",
        proposal: { ...proposal, status: "accepted", runIds: ["run-1"] },
      },
    ])
    setLiveTurn(conversationId, null)
    expect(readLiveTurn(conversationId)).toBeNull()
  })
})
