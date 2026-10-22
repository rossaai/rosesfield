import { describe, expect, it } from "vitest"
import type { Proposal } from "@/api/conversation-wire"
import { hostedFactsOf } from "@/screens/agent/proposal-card"

function proposalWith(inputs: Proposal["request"]["inputs"]): Proposal {
  return {
    id: "4c5d6e7f-8091-4a2b-8c3d-4e5f6a7b8c9d",
    appId: "video",
    request: { inputs, count: 1, aspectRatio: null },
    status: "proposed",
    runId: null,
  }
}

describe("the settings a proposal names", () => {
  it("shows the prompt as text and the model first, then each other setting, as badges", () => {
    const facts = hostedFactsOf(
      proposalWith({
        model: "maker/clip-3",
        prompt: "Zoom out from orbit",
        resolution: "720p",
        count: 2,
      })
    )

    expect(facts?.characterIds).toEqual([])
    expect(facts?.prompts).toEqual([
      { key: "prompt", text: "Zoom out from orbit" },
    ])
    expect(facts?.badges.map((badge) => badge.key)).toEqual([
      "model",
      "resolution",
      "count",
    ])
    expect(facts?.badges[0]?.text).toBe("Clip 3")
    expect(facts?.badges[1]?.text).toBe("720p")
    expect(facts?.badges[2]?.text).toContain("2")
    expect(facts?.badges[2]?.text).not.toBe("2")
  })

  it("leaves a run of the app's own inputs to the app's rows", () => {
    expect(hostedFactsOf(proposalWith({ prompt: "A rose" }))).toBeNull()
    expect(
      hostedFactsOf(proposalWith({ model: "open-picture", prompt: "A rose" }))
    ).toBeNull()
  })
})
