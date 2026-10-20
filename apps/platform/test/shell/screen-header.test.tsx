import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ScreenHeader } from "@/shell/screen-header"

afterEach(cleanup)

function headersOf(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll("header")]
}

describe("the screen header", () => {
  it("gives a phone its own row with the title and the phone action", () => {
    const { container } = render(
      <ScreenHeader
        title="Library"
        phoneTitle="Your library"
        phoneAction={<button type="button">Filter</button>}
      />
    )
    const [phone] = headersOf(container)
    expect(phone?.className.split(" ")).toContain("@regular:hidden")
    expect(phone?.querySelector("h1")?.textContent).toBe("Your library")
    const filter = screen.getByRole("button", { name: "Filter" })
    expect(phone?.contains(filter)).toBe(true)
  })

  it("draws no phone row with no title and no phone action", () => {
    const { container } = render(<ScreenHeader title={null} />)
    expect(headersOf(container)).toHaveLength(1)
  })
})
