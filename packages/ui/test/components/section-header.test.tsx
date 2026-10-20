import { SectionHeader } from "@rosesfield/ui/components/section-header"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("SectionHeader", () => {
  it("puts a title link over one line, 4 px apart, in a row that wraps", () => {
    render(
      <SectionHeader
        title="Picture 2"
        line="Results made with Picture 2"
        href="/models/picture-2"
      />
    )
    const link = screen.getByRole("link", { name: "Picture 2" })
    expect(link.getAttribute("href")).toBe("/models/picture-2")
    const lead = link.closest("[data-slot='section-heading-lead']")
    expect(lead?.className.split(" ")).toContain("gap-1")
    const row = lead?.parentElement
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining(["flex-wrap", "justify-between", "items-end"])
    )
  })

  it("writes a plain title when it has no page", () => {
    render(<SectionHeader title="Shared results" />)
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByRole("heading", { name: "Shared results" })).toBeTruthy()
  })
})
