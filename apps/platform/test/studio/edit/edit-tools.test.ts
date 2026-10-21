import { describe, expect, it } from "vitest"
import { shownTools, toolOf } from "@/studio/edit/edit-tools"
import { imageApp } from "../../sample-app"

const oldAddresses = [
  "angles",
  "relight",
  "try-on",
  "headshots",
  "expand",
  "background-removal",
]

describe("the tools of Edit", () => {
  it("opens the tool of each old address, and no tool for another app", () => {
    for (const id of oldAddresses) {
      expect(toolOf(id)?.id).toBe(id)
    }
    expect(toolOf("image")).toBeNull()
  })

  it("shows Edit first and then the six tools in the row's order, each only when the catalog lists it", () => {
    const app = imageApp()
    const all = shownTools((id) => ({ ...app, id }))
    expect(all.map((one) => one.tool.id)).toEqual(["edit", ...oldAddresses])
    const some = shownTools((id) =>
      id === "relight" || id === "edit" ? { ...app, id } : null
    )
    expect(some.map((one) => one.tool.id)).toEqual(["edit", "relight"])
  })
})
