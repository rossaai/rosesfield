import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  contrastOf,
  LabMark,
  labInitialOf,
  labMarkOf,
  markColourOf,
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

describe("the colour of a lab's mark", () => {
  it("measures contrast as the ratio of the two colours' light, 21 for black on white", () => {
    expect(contrastOf("000000", "FFFFFF")).toBeCloseTo(21, 5)
    expect(contrastOf("FFFFFF", "000000")).toBeCloseTo(21, 5)
    expect(contrastOf("4285F4", "4285F4")).toBe(1)
  })

  it("is the lab's own colour on both schemes when it stands out from the tile", () => {
    expect(markColourOf("4285F4", "light")).toBe("#4285F4")
    expect(markColourOf("4285F4", "dark")).toBe("#4285F4")
  })

  it("falls back to the ink where the lab's colour would vanish into the tile, the control", () => {
    expect(markColourOf("000000", "light")).toBe("#000000")
    expect(markColourOf("000000", "dark")).toBeNull()
    expect(markColourOf("191919", "dark")).toBeNull()
    expect(markColourOf("FFD21E", "light")).toBeNull()
    expect(markColourOf("FFD21E", "dark")).toBe("#FFD21E")
  })

  it("paints a marked lab in its colour per scheme and leaves a lettered lab in the tile's ink", () => {
    const google = render(<LabMark maker="Google" />).container
    expect(google.querySelector("svg")?.getAttribute("style")).toContain(
      "var(--if-light, #4285F4) var(--if-dark, #4285F4)"
    )
    cleanup()
    const eleven = render(<LabMark maker="ElevenLabs" />).container
    expect(eleven.querySelector("svg")?.getAttribute("style")).toContain(
      "var(--if-light, #000000) var(--if-dark, currentColor)"
    )
    cleanup()
    const letter = render(<LabMark maker="Black Forest Labs" />).container
    expect(
      letter.querySelector("[data-slot='lab-mark']")?.getAttribute("style")
    ).toBeNull()
  })
})
