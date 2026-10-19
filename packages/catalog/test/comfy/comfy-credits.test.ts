import type { Cost } from "@rosesfield/contract"
import { CreditMeter } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { comfyCreditsPerUsd, creditsOfCost } from "#comfy/comfy-credits"

describe("Comfy credits", () => {
  it("count the same credits per USD as the engine that measures them", () => {
    expect(comfyCreditsPerUsd).toBe(CreditMeter.creditsPerUsd)
  })

  it("turn a run's cost back into the credits the balance route measured", () => {
    const cost: Cost = { amount: 1.188768 / 211, currency: "USD" }
    expect(creditsOfCost(cost)).toBeCloseTo(1.188768, 9)
  })
})
