import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ShellFooter } from "@/shell/shell-footer"

afterEach(cleanup)

describe("the footer", () => {
  it("links to the repository, the challenge, Privacy, Terms and Trademarks", () => {
    render(<ShellFooter />)
    const footer = screen.getByRole("contentinfo", { name: "Rosesfield" })
    const hrefOf = (name: string): string | null =>
      within(footer).getByRole("link", { name }).getAttribute("href")
    expect(hrefOf("Code on GitHub")).toBe(
      "https://github.com/rossaai/rosesfield"
    )
    expect(hrefOf("The challenge")).toMatch(/^https:\/\/comfy\.org\//)
    expect(hrefOf("Privacy")).toBe("/privacy")
    expect(hrefOf("Terms")).toBe("/terms")
    expect(hrefOf("Trademarks")).toBe(
      "https://github.com/rossaai/rosesfield/blob/main/TRADEMARKS.md"
    )
  })

  it("lists Trademarks in the Legal column, in the one band", () => {
    render(<ShellFooter />)
    const legal = screen
      .getByRole("heading", { name: "Legal" })
      .closest("section")
    if (legal === null) {
      throw new Error("the footer holds a Legal column")
    }
    expect(
      within(legal)
        .getAllByRole("link")
        .map((link) => link.textContent)
    ).toEqual(["Privacy", "Terms", "Trademarks"])
    const footer = screen.getByRole("contentinfo", { name: "Rosesfield" })
    expect(footer.children).toHaveLength(1)
  })

  it("holds text links only, with no glyph, price or form", () => {
    render(<ShellFooter />)
    const footer = screen.getByRole("contentinfo", { name: "Rosesfield" })
    expect(footer.querySelector("svg, img, form, input, button")).toBeNull()
    expect(footer.textContent).not.toMatch(/\d+(\.\d+)? (credits|USD)/)
    expect(within(footer).getAllByRole("link")).toHaveLength(5)
  })
})
