import { describe, expect, it } from "vitest"
import { labInitialOf } from "@/pieces/lab-mark"

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
})
