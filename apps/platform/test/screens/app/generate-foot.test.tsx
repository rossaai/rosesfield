import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { GenerateFoot, submitPriceOf } from "@/screens/app/generate-foot"
import type { StartRun } from "@/screens/app/use-start-run"

afterEach(cleanup)

function startWith(change: Partial<StartRun>, calls: string[]): StartRun {
  return {
    generate: () => calls.push("generate"),
    isPending: false,
    error: null,
    price: "",
    ...change,
  }
}

describe("Generate at the foot of a column", () => {
  it("is one bar with the label, a sparkle and the run's price, with no unit word", () => {
    const calls: string[] = []
    render(
      <GenerateFoot
        start={startWith(
          {
            priceValue: "80",
            priceName: t("run.generate.priced", { amount: "80" }),
          },
          calls
        )}
      />
    )
    const button = screen.getByRole("button", {
      name: t("run.generate.priced", { amount: "80" }),
    })
    expect(button.getAttribute("data-form")).toBe("bar")
    expect(button.className.split(" ")).toContain("h-field")
    expect(button.textContent).toBe(`${t("run.generate")}80`)
    const price = button.querySelector('[data-slot="generate-button-price"]')
    expect(price?.querySelector("svg")).not.toBeNull()
    fireEvent.click(button)
    expect(calls).toEqual(["generate"])
  })

  it("shows no price while the price is unknown", () => {
    render(<GenerateFoot start={startWith({ priceValue: null }, [])} />)
    const button = screen.getByRole("button", { name: t("run.generate") })
    expect(button.getAttribute("data-priced")).toBe("no")
    expect(button.textContent).toBe(t("run.generate"))
  })
})

describe("the price on the prompt bar's Generate tile", () => {
  it("is the run's price in credits and its spoken name", () => {
    const start = startWith(
      {
        price: t("run.price.credits", { amount: "80" }),
        priceValue: "80",
        priceName: t("run.generate.priced", { amount: "80" }),
      },
      []
    )
    expect(submitPriceOf(start)).toEqual({
      submitValue: "80",
      submitName: t("run.generate.priced", { amount: "80" }),
    })
  })

  it("holds no sentence while the price is unknown", () => {
    const start = startWith(
      { price: "", priceValue: null, priceName: null },
      []
    )
    expect(submitPriceOf(start)).toEqual({})
  })
})
