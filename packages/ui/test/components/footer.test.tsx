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
      ]}
      notice="MIT licence"
      legal={[
        { id: "privacy", label: "Privacy", href: "/privacy" },
        { id: "terms", label: "Terms", href: "/terms" },
      ]}
    />
  )
}

describe("Footer", () => {
  it("closes the page in two full-width bands of text links, 24 px rows on a 36 px pitch", () => {
    renderFooter()
    const footer = screen.getByRole("contentinfo", { name: "Rosesfield" })
    expect(footer.children).toHaveLength(2)
    for (const link of screen.getAllByRole("link")) {
      expect(link.querySelector("svg, img")).toBeNull()
      expect(link.className.split(" ")).toContain("h-6")
    }
    expect(
      screen.getByRole("link", { name: "Code" }).closest("ul")?.className
    ).toContain("gap-3")
    expect(footer.querySelector("form, button")).toBeNull()
  })

  it("sets the groups in five equal columns from the width switch", () => {
    renderFooter()
    const grid = screen
      .getByRole("heading", { name: "Project" })
      .closest("section")?.parentElement
    expect(grid?.className.split(" ")).toEqual(
      expect.arrayContaining(["grid-cols-2", "@regular:grid-cols-5"])
    )
    expect(grid?.className).not.toContain("grid-flow-col")
  })

  it("holds a phone's two group columns at 142 px with 48 px between them, as the reference's 332 px grid does", () => {
    renderFooter()
    const grid = screen
      .getByRole("heading", { name: "Project" })
      .closest("section")?.parentElement
    expect(grid?.className.split(" ")).toEqual(
      expect.arrayContaining(["max-w-83", "gap-12", "@regular:max-w-none"])
    )
  })

  it("keeps 40 px clear at the heading's end, as the reference's heading does at both widths", () => {
    renderFooter()
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "One place to make images, video and sound",
    })
    expect(heading.className.split(" ")).toContain("pe-10")
  })

  it("puts the notice last and centred on a phone, first and at the start from the width switch", () => {
    renderFooter()
    const notice = screen.getByText("MIT licence")
    expect(notice.className.split(" ")).toEqual(
      expect.arrayContaining(["text-center", "@regular:text-start"])
    )
    expect(notice.parentElement?.className.split(" ")).toEqual(
      expect.arrayContaining(["flex-col-reverse", "@regular:flex-row"])
    )
  })
})
