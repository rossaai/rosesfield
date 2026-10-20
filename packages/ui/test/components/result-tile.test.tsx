import { ResultTile } from "@rosesfield/ui/components/result-tile"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

function renderTile(form: "card" | "library" = "card") {
  const calls = { open: vi.fn(), recreate: vi.fn() }
  render(
    <ResultTile
      kind="image"
      src="result.png"
      alt="A red bicycle"
      aspect={{ width: 9, height: 16 }}
      app="Image"
      model="Picture 2"
      openLabel="Open this result"
      expandLabel="Expand this result"
      moreLabel="More actions"
      recreateLabel="Recreate"
      recreateName="Recreate this result"
      onOpen={calls.open}
      onRecreate={calls.recreate}
      form={form}
    />
  )
  return calls
}

describe("ResultTile", () => {
  it("shows its clip alone at rest and raises its three groups together on hover or focus", () => {
    renderTile()
    const groups = [
      document.querySelector("[data-slot='media-veil']"),
      document.querySelector("[data-slot='result-tile-actions']"),
      screen.getByRole("button", { name: "Recreate this result" }).parentElement,
    ]
    for (const group of groups) {
      expect(group?.className.split(" ")).toEqual(
        expect.arrayContaining([
          "opacity-0",
          "group-hover/reveal:opacity-100",
          "group-focus-within/reveal:opacity-100",
          "hidden",
          "@regular:flex",
        ])
      )
    }
  })

  it("names its app and model and carries no price, title or prompt", () => {
    renderTile()
    const tile = document.querySelector("[data-slot='media']")
    expect(tile?.textContent).toBe("Image · Picture 2Recreate")
  })

  it("opens from its open target and from Expand, and recreates from Recreate", () => {
    const calls = renderTile()
    fireEvent.click(screen.getByRole("button", { name: "Open this result" }))
    fireEvent.click(screen.getByRole("button", { name: "Expand this result" }))
    fireEvent.click(screen.getByRole("button", { name: "Recreate this result" }))
    expect(calls.open).toHaveBeenCalledTimes(2)
    expect(calls.recreate).toHaveBeenCalledTimes(1)
  })

  it("keeps 28 px circles 12 px apart on a narrow card, and 32 px circles 8 px apart in the library", () => {
    renderTile("card")
    const card = document.querySelector("[data-slot='result-tile-actions']")
    expect(card?.className.split(" ")).toEqual(
      expect.arrayContaining(["gap-3", "top-2", "right-2"])
    )
    expect(
      screen.getByRole("button", { name: "Expand this result" }).className
    ).toContain("size-7")
    cleanup()
    renderTile("library")
    const library = document.querySelector("[data-slot='result-tile-actions']")
    expect(library?.className.split(" ")).toEqual(
      expect.arrayContaining(["gap-2", "top-3", "right-3"])
    )
    expect(
      screen.getByRole("button", { name: "Expand this result" }).className
    ).toContain("size-8")
  })
})
