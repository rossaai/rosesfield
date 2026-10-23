import { describe, expect, it } from "vitest"
import { formatAmount } from "@/copy/format"

describe("a credit figure", () => {
  it("rounds a figure of one credit or more to a whole number", () => {
    expect(formatAmount(1.8902)).toBe("2")
    expect(formatAmount(16.8213)).toBe("17")
    expect(formatAmount(11.0249)).toBe("11")
    expect(formatAmount(17)).toBe("17")
  })

  it("shows a figure below one credit as <1", () => {
    expect(formatAmount(0.1214)).toBe("<1")
    expect(formatAmount(0.003_227_9)).toBe("<1")
  })

  it("never prints four decimals", () => {
    for (const amount of [0.1214, 1.8902, 16.8213, 0.66, 19.2401]) {
      expect(formatAmount(amount)).not.toMatch(/\.\d{3,}$/)
    }
  })
})
