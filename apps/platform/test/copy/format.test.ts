import { describe, expect, it } from "vitest"
import { formatBalance, formatWholeCredits } from "@/copy/format"
import { t } from "@/copy/t"
import { amountOf } from "@/screens/app/use-start-run"

const amounts = [0.04, 0.5, 1, 1.2, 12.5, 1688.4]

describe("a price in credits", () => {
  it("rounds up to a whole credit, and never under 1", () => {
    expect(amounts.map(formatWholeCredits)).toEqual([
      "1",
      "1",
      "1",
      "2",
      "13",
      "1,689",
    ])
  })

  it("keeps a whole price whole, past floating point error", () => {
    expect(formatWholeCredits(17)).toBe("17")
    expect(formatWholeCredits(0.1 + 0.2 + 11.7)).toBe("12")
  })

  it("never holds < or a decimal, alone or as a range", () => {
    for (const amount of amounts) {
      expect(formatWholeCredits(amount)).not.toMatch(/<|\.\d/)
      expect(amountOf(amount * 3, amount)).not.toMatch(/<|\.\d/)
    }
  })

  it("control: the pattern catches the forms the rule refuses", () => {
    for (const refused of ["<1", "0.5", "1.2", "1,688.4"]) {
      expect(refused).toMatch(/<|\.\d/)
    }
  })

  it("shows a range only when its two ends differ once rounded up", () => {
    expect(amountOf(0.8, 0.3)).toBe("1")
    expect(amountOf(12.5, 1.2)).toBe(
      t("field.number.range", { min: "2", max: "13" })
    )
  })
})

describe("a balance in credits", () => {
  it("rounds to a whole number, and shows a balance under 1 as <1", () => {
    expect(formatBalance(4201.5)).toBe("4,202")
    expect(formatBalance(0.4)).toBe("<1")
    expect(formatBalance(0)).toBe("0")
  })
})
