import { InlineChip } from "@rosesfield/ui/components/inline-chip"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("InlineChip", () => {
  it("wears a link as the hortensia words on their tint, a capsule with a leading glyph and no underline", () => {
    render(<InlineChip href="https://comfy.org">comfy.org</InlineChip>)
    const link = screen.getByRole("link", { name: "comfy.org" })
    expect(link.getAttribute("data-slot")).toBe("inline-chip")
    expect(link.className.split(" ")).toEqual(
      expect.arrayContaining([
        "bg-hor-tint",
        "text-hor-text",
        "rounded-full",
        "px-s1_5",
        "font-medium",
        "no-underline",
      ])
    )
    expect(
      link.querySelector("[data-slot='inline-chip-lead'] svg")
    ).not.toBeNull()
    expect(
      link.querySelector("[data-slot='inline-chip-words']")?.textContent
    ).toBe("comfy.org")
  })
})
