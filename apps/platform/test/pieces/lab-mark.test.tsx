import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  LabMark,
  labInitialOf,
  labMarkOf,
  letterInkOf,
} from "@/pieces/lab-mark"

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
    expect(labMarkOf("HeyGen")).toBeNull()
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

  it("keeps the first letter of a lab whose mark no source publishes", () => {
    const { container } = render(<LabMark maker="HeyGen" />)
    const mark = container.querySelector("[data-slot='lab-mark']")
    expect(mark?.getAttribute("data-mark")).toBe("letter")
    expect(mark?.querySelector("svg")).toBeNull()
    expect(mark?.textContent).toBe("H")
  })

  it("draws a mark from a lab's own brand page in its view box, its accent in the brand colour", () => {
    const { container } = render(<LabMark maker="Beeble" />)
    const mark = container.querySelector("[data-slot='lab-mark']")
    expect(mark?.getAttribute("data-mark")).toBe("beeble")
    expect(labMarkOf("Beeble")?.source).toBe("https://beeble.ai/brand")
    const svg = mark?.querySelector("svg")
    expect(svg?.getAttribute("viewBox")).toBe("0 0 300 300")
    expect(svg?.getAttribute("style")).toContain(
      "var(--if-light, #000000) var(--if-dark, #FFFFFF)"
    )
    const accent = svg?.querySelector("[data-slot='lab-mark-accent']")
    expect(accent?.getAttribute("style")).toContain(
      "var(--if-light, #00D084) var(--if-dark, #00D084)"
    )
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

  it("seats a lettered lab's letter on its brand colour, never grey, in the ink that reads on it", () => {
    const heygen = render(<LabMark maker="HeyGen" />).container
    const mark = heygen.querySelector<HTMLElement>("[data-slot='lab-mark']")
    expect(mark?.getAttribute("data-ground")).toBe("mark")
    expect(mark?.style.backgroundColor).toBe("rgb(0, 195, 255)")
    expect(mark?.style.color).toBe("rgb(0, 0, 0)")
    cleanup()
    const birefnet = render(<LabMark maker="BiRefNet authors" />).container
    expect(
      birefnet.querySelector<HTMLElement>("[data-slot='lab-mark']")?.style.color
    ).toBe("rgb(255, 255, 255)")
    expect(letterInkOf("DBDAC6")).toBe("#000000")
    expect(letterInkOf("800080")).toBe("#FFFFFF")
  })
})
