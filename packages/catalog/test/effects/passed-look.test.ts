import { describe, expect, it } from "vitest"
import { effectRuns, recipeOf } from "#effects/effect-recipes"

describe("the look that passed", () => {
  it("keeps the run Push into eye passed with as the one kept row of the run ledger", () => {
    const preview = recipeOf("push-into-eye").preview
    expect(effectRuns).toEqual([
      expect.objectContaining({
        runId: preview?.runId,
        effect: "push-into-eye",
        workflowHash: preview?.workflowHash,
        seed: preview?.seed,
        resolution: preview?.resolution,
        aspectRatio: preview?.aspectRatio,
        verdict: "kept",
        failed: [],
      }),
    ])
  })
})
