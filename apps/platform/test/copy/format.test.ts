import { describe, expect, it } from "vitest"
import { formatAmount } from "@/copy/format"

describe("a credit figure", () => {
  it("keeps at most two decimals at one credit or more", () => {
    expect(formatAmount(1.8902)).toBe("1.89")
    expect(formatAmount(16.8213)).toBe("16.82")
    expect(formatAmount(11.0249)).toBe("11.02")
    expect(formatAmount(17)).toBe("17")
  })

  it("keeps two significant digits below one credit, so a small price stays readable", () => {
    expect(formatAmount(0.1214)).toBe("0.12")
    expect(formatAmount(0.003_227_9)).toBe("0.0032")
  })

  it("never prints four decimals", () => {
    for (const amount of [0.1214, 1.8902, 16.8213, 0.66, 19.2401]) {
      expect(formatAmount(amount)).not.toMatch(/\.\d{3,}$/)
    }
  })
})
