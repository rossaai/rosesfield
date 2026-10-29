import { describe, expect, it } from "vitest"
import { exampleRuns, libraryExamples } from "#motion/examples/library-examples"

const passedExamples = libraryExamples.filter((example) => example.passed)

describe("the looks that passed", () => {
  it("keeps the run each passed look passed with as a kept row of the run ledger", () => {
    expect(passedExamples.length).toBeGreaterThan(0)
    expect(exampleRuns).toEqual(
      expect.arrayContaining(
        passedExamples.map(({ id, preview }) =>
          expect.objectContaining({
            runId: preview?.runId,
            example: id,
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
