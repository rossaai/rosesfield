import { describe, expect, it } from "vitest"
import { formatNumber } from "@/copy/format"
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

  it("says Price unknown for a model with no price", () => {
    expect(priceLabelsOf(null, false)).toEqual({
      price: t("run.price.unknown"),
      priceValue: null,
      priceName: null,
    })
  })

  it("control: says the demo engine's words on the demo engine, whatever the price", () => {
    expect(priceLabelsOf(null, true).price).toBe(t("run.price.demo"))
    expect(priceLabelsOf(6.79, true).price).toBe(t("run.price.demo"))
  })
})
