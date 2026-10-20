import { Footer } from "@rosesfield/ui/components/footer"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("Footer", () => {
  it("closes the page in two full-width bands of text links, 24 px rows on a 36 px pitch", () => {
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
    const footer = screen.getByRole("contentinfo", { name: "Rosesfield" })
    expect(footer.children).toHaveLength(2)
    for (const link of screen.getAllByRole("link")) {
      expect(link.querySelector("svg, img")).toBeNull()
      expect(link.className.split(" ")).toContain("h-6")
    }
    expect(screen.getByRole("link", { name: "Code" }).closest("ul")?.className).toContain(
      "gap-3"
    )
    expect(footer.querySelector("form, button")).toBeNull()
  })
})
