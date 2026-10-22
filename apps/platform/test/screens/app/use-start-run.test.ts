import { describe, expect, it } from "vitest"
import { formatAmount, formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { priceLabelsOf } from "@/screens/app/use-start-run"

describe("the price Generate shows", () => {
  it("shows the credits a priced run costs", () => {
    const amount = formatNumber(12.37)
    expect(priceLabelsOf(12.37, false)).toEqual({
      price: "",
      priceValue: amount,
      priceName: t("run.generate.priced", { amount }),
    })
  })

  it("shows Generate alone for a model with no price, and never Price unknown", () => {
    expect(priceLabelsOf(null, false)).toEqual({
      price: "",
      priceValue: null,
      priceName: null,
    })
  })

  it("shows Generate alone for a price of 0, and never 0", () => {
    expect(priceLabelsOf(0, false)).toEqual({
      price: "",
      priceValue: null,
      priceName: null,
    })
  })

  it("shows a price below one hundredth of a credit with its own digits, not as 0", () => {
    const amount = formatAmount(0.004)
    expect(amount).not.toBe(formatNumber(0))
    expect(priceLabelsOf(0.004, false)).toEqual({
      price: "",
      priceValue: amount,
      priceName: t("run.generate.priced", { amount }),
    })
  })

  it("control: says the demo engine's words on the demo engine, whatever the price", () => {
    expect(priceLabelsOf(null, true).price).toBe(t("run.price.demo"))
    expect(priceLabelsOf(6.79, true).price).toBe(t("run.price.demo"))
  })
})
