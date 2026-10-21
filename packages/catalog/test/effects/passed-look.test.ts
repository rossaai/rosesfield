import { describe, expect, it } from "vitest"
import { effectRuns, passedRecipes } from "#effects/effect-recipes"

describe("the looks that passed", () => {
  it("keeps the run each passed look passed with as a kept row of the run ledger", () => {
    expect(passedRecipes.length).toBeGreaterThan(0)
    expect(effectRuns).toEqual(
      expect.arrayContaining(
        passedRecipes.map(({ effect, preview }) =>
          expect.objectContaining({
            runId: preview?.runId,
            effect,
            workflowHash: preview?.workflowHash,
            seed: preview?.seed,
            resolution: preview?.resolution,
            aspectRatio: preview?.aspectRatio,
            verdict: "kept",
            failed: [],
          })
        )
      )
    )
  })
})
