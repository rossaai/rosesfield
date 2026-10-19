import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("CreditPrice", () => {
  it("shows the coins glyph before the figure", () => {
    const { container } = render(<CreditPrice amount="14.48" />)
    const price = container.firstElementChild
    expect(price?.firstElementChild?.tagName.toLowerCase()).toBe("svg")
    expect(price?.textContent).toBe("14.48")
    expect(price?.className).toContain("tabular-nums")
  })
})
