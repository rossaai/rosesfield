import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { pieceEntries } from "@/gallery/entries/pieces"

afterEach(cleanup)

function iconsOfLongestVideo(): string[] {
  const state = pieceEntries
    .flatMap((entry) => entry.states)
    .find((one) => one.id === "longest-video")
  if (state === undefined) {
    throw new Error("no longest video bar")
  }
  const { container } = render(state.render())
  return [...container.querySelectorAll("svg")].map((svg) =>
    String(svg.getAttribute("class"))
  )
}

describe("the gallery's longest Video bar", () => {
  it("draws the length and camera move icons the bar's setting chips draw", () => {
    const icons = iconsOfLongestVideo().join(" ")
    expect(icons).toContain("lucide-clock")
    expect(icons).toContain("lucide-move")
  })
})
