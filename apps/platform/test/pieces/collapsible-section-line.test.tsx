import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { CollapsibleSection } from "@/pieces/collapsible-section"

afterEach(cleanup)

describe("a collapsible section's title", () => {
  it("starts on the field line, at the same inset as every field's label", () => {
    render(
      <CollapsibleSection title="Advanced">
        <p>inside</p>
      </CollapsibleSection>
    )
    const title = screen.getByRole("button", { name: "Advanced" })
    expect(title.className).toContain("ps-s5")
    expect(title.className).not.toContain("px-s1")
  })
})
