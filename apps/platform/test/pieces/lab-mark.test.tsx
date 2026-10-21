import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { LabMark, labInitialOf, labMarkOf } from "@/pieces/lab-mark"

afterEach(cleanup)

describe("the lab's mark", () => {
  it("is the first letter or figure of the maker the catalog names", () => {
    expect(labInitialOf("Black Forest Labs")).toBe("B")
    expect(labInitialOf("  42 labs")).toBe("4")
    expect(labInitialOf("élan")).toBe("É")
  })

  it("is empty for a maker with no letter", () => {
    expect(labInitialOf("")).toBe("")
    expect(labInitialOf(" - ")).toBe("")
  })

  it("is the icon set's path for a lab the catalog marks, and nothing for a lab it does not", () => {
    expect(labMarkOf("Google")).toMatchObject({ slug: "google" })
    expect(labMarkOf("Google")?.path).toMatch(/^M/)
    expect(labMarkOf("Black Forest Labs")).toBeNull()
    expect(labMarkOf("toString")).toBeNull()
  })
})

describe("LabMark", () => {
  it("draws a marked lab's mark as one 16 px path from the icon set, and no picture", () => {
    const { container } = render(<LabMark maker="ElevenLabs" />)
    const mark = container.querySelector("[data-slot='lab-mark']")
    expect(mark?.getAttribute("data-mark")).toBe("elevenlabs")
    expect(mark?.getAttribute("aria-hidden")).toBe("true")
    const svg = mark?.querySelector("svg")
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24")
    expect(svg?.getAttribute("class")).toBe("size-4")
    expect(svg?.querySelectorAll("path")).toHaveLength(1)
    expect(container.querySelector("img")).toBeNull()
    expect(mark?.textContent).toBe("")
  })

  it("keeps the first letter of a lab the icon set does not hold", () => {
    const { container } = render(<LabMark maker="Black Forest Labs" />)
    const mark = container.querySelector("[data-slot='lab-mark']")
    expect(mark?.getAttribute("data-mark")).toBe("letter")
    expect(mark?.querySelector("svg")).toBeNull()
    expect(mark?.textContent).toBe("B")
  })
})
