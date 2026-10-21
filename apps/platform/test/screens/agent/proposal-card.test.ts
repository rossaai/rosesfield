import { describe, expect, it } from "vitest"
import type { Proposal } from "@/api/conversation-wire"
import { t } from "@/copy/t"
import { hostedRowsOf } from "@/screens/agent/proposal-card"

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
  it("names the model first, then each setting the agent chose", () => {
    const rows = hostedRowsOf(
      proposalWith({
        model: "maker/clip-3",
        prompt: "Zoom out from orbit",
        resolution: "720p",
      })
    )

    expect(rows?.map((row) => row.key)).toEqual([
      "model",
      "prompt",
      "resolution",
    ])
    expect(rows?.[0]).toMatchObject({
      label: t("model.picker.title"),
      value: "Clip 3",
    })
    expect(rows?.[2]?.label).not.toBe("")
  })

  it("leaves a run of the app's own inputs to the app's rows", () => {
    expect(hostedRowsOf(proposalWith({ prompt: "A rose" }))).toBeNull()
    expect(
      hostedRowsOf(proposalWith({ model: "open-picture", prompt: "A rose" }))
    ).toBeNull()
  })
})
