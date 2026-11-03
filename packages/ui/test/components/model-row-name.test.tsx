import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  openBadge,
  openPicker,
  rowElementOf,
  rowOf,
} from "./model-picker-fixture"

const name = "MiniMax H3"

const cutRow = rowOf("minimax/h3", {
  name,
  rank: { place: 1, label: "#1", note: "Rank from Video Arena" },
  badges: [{ kind: "value", label: "Best value" }, openBadge],
})

function cutToRoom(text: number, room: number): void {
  const shown = rowElementOf(name).querySelector<HTMLElement>(
    "[data-slot='model-row-name']"
  )
  if (shown === null) {
    throw new Error("no name")
  }
  Object.defineProperty(shown, "scrollWidth", { value: text })
  Object.defineProperty(shown, "clientWidth", { value: room })
}

function tipWords(): string | null {
  return (
    document.querySelector("[data-slot='tooltip-content']")?.textContent ?? null
  )
}

afterEach(cleanup)

describe("ModelRow's name", () => {
  it("shows the whole name in a tooltip on its row when the row cuts it", async () => {
    openPicker({ rows: [cutRow] })
    cutToRoom(80, 59)
    fireEvent.focus(screen.getByRole("option", { name }))
    await waitFor(() => expect(tipWords()).toBe(name))
  })

  it("control: shows the rank's note in a tooltip on the same row", async () => {
    openPicker({ rows: [cutRow] })
    cutToRoom(80, 59)
    const rank = rowElementOf(name).querySelector<HTMLElement>(
      "[data-slot='model-row-rank']"
    )
    if (rank === null) {
      throw new Error("no rank")
    }
    fireEvent.focus(rank)
    await waitFor(() => expect(tipWords()).toBe("Rank from Video Arena"))
  })
})
