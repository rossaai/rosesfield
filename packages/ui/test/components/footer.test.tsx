import { Footer } from "@rosesfield/ui/components/footer"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function renderFooter(): void {
  render(
    <Footer
      label="Rosesfield"
      heading="One place to make images, video and sound"
      groups={[
        {
          id: "project",
          heading: "Project",
          links: [
            { id: "code", label: "Code", href: "https://github.com/" },
            { id: "challenge", label: "Challenge", href: "/challenge" },
          ],
        },
        {
          id: "legal",
          heading: "Legal",
          links: [
            { id: "privacy", label: "Privacy", href: "/privacy" },
            { id: "trademarks", label: "Trademarks", href: "/trademarks" },
          ],
        },
      ]}
    />
  )
}

describe("Footer", () => {
  it("closes the page in one muted band of 26 px text links that tint on the tint preset", () => {
    renderFooter()
    const footer = screen.getByRole("contentinfo", { name: "Rosesfield" })
    expect(footer.children).toHaveLength(1)
    expect(footer.firstElementChild?.getAttribute("data-ground")).toBe(
      "surface"
    )
    expect(footer.querySelectorAll("p")).toHaveLength(0)
    for (const link of screen.getAllByRole("link")) {
      expect(link.querySelector("svg, img")).toBeNull()
      expect(link.className.split(" ")).toEqual(
        expect.arrayContaining(["h-s8", "hover:text-ink-muted", "motion-tint"])
      )
    }
    expect(footer.querySelector("form, button")).toBeNull()
  })

  it("divides on thirds from the width switch: the tagline in the first, the groups across the other two", () => {
    renderFooter()
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "One place to make images, video and sound",
    })
    expect(heading.className.split(" ")).toContain("text-title")
    expect(heading.parentElement?.className.split(" ")).toContain(
      "@regular:grid-cols-3"
    )
    const groups = screen
      .getByRole("heading", { name: "Project" })
      .closest("section")?.parentElement
    expect(groups?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "grid-cols-2",
        "@regular:col-span-2",
        "@regular:grid-flow-col",
        "@regular:auto-cols-fr",
      ])
    )
  })
})
