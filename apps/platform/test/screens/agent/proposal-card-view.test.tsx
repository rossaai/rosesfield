import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Proposal } from "@/api/conversation-wire"
import { ProposalCard } from "@/screens/agent/proposal-card"
import { renderAgent } from "./agent-screen-render"

const proposal: Proposal = {
  id: "4c5d6e7f-8091-4a2b-8c3d-4e5f6a7b8c9d",
  appId: "video",
  request: {
    inputs: {
      model: "maker/clip-3",
      prompt: "Zoom out from orbit",
      resolution: "720p",
    },
    count: 1,
    aspectRatio: null,
  },
  status: "proposed",
  runId: null,
}

let asked = 0

beforeEach(() => {
  asked = 0
  vi.stubGlobal("fetch", () => {
    asked += 1
    return Promise.resolve(
      new Response(JSON.stringify({ price: { source: "unknown" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("a proposal card with no known price", () => {
  it("shows its prompt as text, its model and settings as badges in one row, and no price", async () => {
    renderAgent(() => (
      <ProposalCard
        conversationId="c3cfa88a-1688-41ae-a38f-b931f134c3d9"
        proposal={proposal}
      />
    ))
    const prompt = await screen.findByText("Zoom out from orbit")
    await vi.waitFor(() => expect(asked).toBeGreaterThan(0))
    const card = prompt.closest("[data-slot='card']") ?? document.body
    const badges = card.querySelector("[data-slot='proposal-badges']")
    expect(
      [...(badges?.querySelectorAll("[data-slot='badge']") ?? [])].map(
        (badge) => badge.textContent
      )
    ).toEqual(["Clip 3", "720p"])
    expect(card.querySelector("dl")).toBeNull()
    expect(card.querySelector(".text-caption")).toBeNull()
  })
})
