import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  openPicker,
  priceOf,
  rowElementOf,
  rowOf,
} from "./model-picker-fixture"

const rows = [
  rowOf("zeta/one", {
    name: "Zeta One",
    price: { amount: "14.48", name: "14.48 Comfy credits", credits: 14.48 },
  }),
  rowOf("alpha/two", { name: "Alpha Two", price: priceOf(3) }),
  rowOf("beta/three", { name: "Beta Three" }),
]

afterEach(cleanup)

describe("ModelPicker's prices", () => {
  it("shows a priced row's credits at its end and names them with the model, and shows nothing for a row with no price", () => {
    openPicker({ rows })
    const zeta = screen.getByRole("option", {
      name: "Zeta One, 14.48 Comfy credits",
    })
    const row = zeta.closest<HTMLElement>("[data-slot='model-row']")
    expect(row?.querySelector("[data-slot='credit-price']")?.textContent).toBe(
      "14.48"
    )
    const beta = rowElementOf("Beta Three")
    expect(beta.querySelector("[data-slot='credit-price']")).toBeNull()
    expect(
      beta
        .querySelector("[data-slot='model-row-price']")
        ?.getAttribute("data-state")
    ).toBe("none")
  })

  it("holds a skeleton where a price will show while the prices load, the control", () => {
    openPicker({ rows, isPricing: true })
    expect(
      rowElementOf("Beta Three").querySelector(
        "[data-slot='model-row-price-loading']"
      )
    ).not.toBeNull()
    const zeta = screen
      .getByRole("option", { name: "Zeta One, 14.48 Comfy credits" })
      .closest<HTMLElement>("[data-slot='model-row']")
    expect(
      zeta?.querySelector("[data-slot='model-row-price-loading']")
    ).toBeNull()
  })
})
