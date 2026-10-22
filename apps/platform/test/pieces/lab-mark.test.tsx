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
    expect(labMarkOf("Beeble")).toBeNull()
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
    const { container } = render(<LabMark maker="Beeble" />)
    const mark = container.querySelector("[data-slot='lab-mark']")
    expect(mark?.getAttribute("data-mark")).toBe("letter")
    expect(mark?.querySelector("svg")).toBeNull()
    expect(mark?.textContent).toBe("B")
  })
})

describe("the colour of a lab's mark", () => {
  it("draws the lab's published light and dark colours, with no grey in place of a dark mark", () => {
    const anthropic = render(<LabMark maker="Anthropic" />).container
    const style = anthropic.querySelector("svg")?.getAttribute("style") ?? ""
    expect(style).toContain("var(--if-light, #191919) var(--if-dark, #FFFFFF)")
    expect(style).not.toContain("currentColor")
    cleanup()
    const google = render(<LabMark maker="Google" />).container
    expect(google.querySelector("svg")?.getAttribute("style")).toContain(
      "var(--if-light, #4285F4) var(--if-dark, #4285F4)"
    )
  })

  it("seats a mark whose row names a ground on a tile of that ground, the Comfy mark yellow on ink", () => {
    const { container } = render(<LabMark maker="Comfy" />)
    const mark = container.querySelector<HTMLElement>("[data-slot='lab-mark']")
    expect(mark?.getAttribute("data-ground")).toBe("mark")
    expect(mark?.className).toContain("rounded-dense")
    expect(mark?.style.backgroundColor).toBe("rgb(33, 25, 39)")
    expect(container.querySelector("svg")?.getAttribute("style")).toContain(
      "var(--if-light, #F2FF59) var(--if-dark, #F2FF59)"
    )
  })

  it("fills an even-odd mark by the even-odd rule, so its holes stay open", () => {
    const { container } = render(<LabMark maker="OpenAI" />)
    expect(container.querySelector("path")?.getAttribute("fill-rule")).toBe(
      "evenodd"
    )
    cleanup()
    const google = render(<LabMark maker="Google" />).container
    expect(google.querySelector("path")?.getAttribute("fill-rule")).toBeNull()
  })

  it("leaves a lettered lab with no colour of its own", () => {
    const letter = render(<LabMark maker="Beeble" />).container
    expect(
      letter.querySelector("[data-slot='lab-mark']")?.getAttribute("style")
    ).toBeNull()
  })
})
