import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  CharactersScreen,
  characterSkeletonCount,
} from "@/screens/characters/characters-screen"
import { renderAt } from "../../shell/shell-router"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Characters while it loads", () => {
  it("draws a few cards of the real card's shape, a square picture over a name and a count line", async () => {
    renderAt("/characters", () => (
      <TooltipProvider>
        <CharactersScreen />
      </TooltipProvider>
    ))
    await screen.findByRole("heading", { name: "Characters" })
    const cards = [
      ...document.querySelectorAll("[data-skeleton='character']"),
    ]
    expect(cards).toHaveLength(characterSkeletonCount)
    for (const card of cards) {
      expect(card.querySelector("[data-slot='card']")).not.toBeNull()
      expect(
        card.querySelector("[data-shape='thumbnail']")?.className.split(" ")
      ).toContain("aspect-square")
      expect(card.querySelectorAll("[data-shape='line']")).toHaveLength(2)
    }
    expect(document.querySelector(".aspect-\\[3\\/4\\]")).toBeNull()
  })
})
