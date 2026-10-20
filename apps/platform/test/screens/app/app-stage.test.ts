import { describe, expect, it } from "vitest"
import { shownTab } from "@/screens/app/app-stage"

describe("the canvas's tab", () => {
  it("chooses How it works while you have no output, and History once you do", () => {
    expect(shownTab(null, false)).toBe("how")
    expect(shownTab(null, true)).toBe("history")
    expect(shownTab(null, null)).toBe("history")
  })

  it("keeps the tab you chose", () => {
    expect(shownTab("history", false)).toBe("history")
    expect(shownTab("how", true)).toBe("how")
  })
})
