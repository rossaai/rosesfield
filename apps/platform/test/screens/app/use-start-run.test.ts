import { describe, expect, it } from "vitest"
import { formatWholeCredits } from "@/copy/format"
import { t } from "@/copy/t"
import { priceLabelsOf } from "@/screens/app/use-start-run"

describe("the price Generate shows", () => {
  it("shows the credits a priced run costs", () => {
    const amount = formatWholeCredits(12.37)
    expect(priceLabelsOf(12.37, false)).toEqual({
      price: "",
      priceValue: amount,
      priceName: t("run.generate.priced", { amount }),
    })
  })

  it("names a price measured on your last run at these settings, and an estimate held to such a run, as what they are", () => {
    const amount = formatWholeCredits(60.35)
    expect(priceLabelsOf(60.35, false, "measured").priceName).toBe(
      t("run.generate.measured", { amount })
    )
    expect(priceLabelsOf(60.35, false, "estimate").priceName).toBe(
      t("run.generate.estimated", { amount })
    )
    expect(priceLabelsOf(60.35, false, "rates").priceName).toBe(
      t("run.generate.priced", { amount })
    )
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

  it("shows a price below one credit as 1, not as 0 or <1", () => {
    const amount = formatWholeCredits(0.004)
    expect(amount).toBe("1")
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
