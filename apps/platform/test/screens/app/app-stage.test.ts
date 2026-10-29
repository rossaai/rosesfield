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

describe("the Library tab", () => {
  it("opens on the Library while you have no output in an app with examples", () => {
    expect(shownTab(null, false, true)).toBe("library")
    expect(shownTab(null, true, true)).toBe("history")
    expect(shownTab("library", true, true)).toBe("library")
  })

  it("never opens the Library in an app with no examples, even when the address asks for it, the control", () => {
    expect(shownTab("library", false, false)).toBe("how")
    expect(shownTab("library", true, false)).toBe("history")
    expect(shownTab(null, false, false)).toBe("how")
  })
})
