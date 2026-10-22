import { ResultTile } from "@rosesfield/ui/components/result-tile"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderTile(form: "card" | "library" = "card", sound?: ReactNode) {
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
      {...(sound === undefined ? {} : { sound })}
    />
  )
  return calls
}

function slot(name: string): Element | null {
  return document.querySelector(`[data-slot='${name}']`)
}

describe("ResultTile's chrome", () => {
  it("shows its media alone at rest and raises its facts, circles and Recreate together on hover or focus", () => {
    renderTile()
    for (const group of [
      slot("media-chrome-facts"),
      slot("media-chrome-actions"),
      slot("media-chrome-action"),
    ]) {
      expect(group?.className.split(" ")).toEqual(
        expect.arrayContaining([
          "opacity-0",
          "group-hover/reveal:opacity-100",
          "group-focus-within/reveal:opacity-100",
          "motion-tint",
          "hidden",
          "@regular:flex",
        ])
      )
    }
  })

  it("names its app and model on a material pill with its kind's mark, and carries no price, title or prompt", () => {
    renderTile()
    const tile = slot("media")
    expect(tile?.textContent).toBe("Image · Picture 2Recreate")
    const pill = slot("media-chrome-facts")?.querySelector(
      "[data-slot='media-badge']"
    )
    expect(pill?.className.split(" ")).toEqual(
      expect.arrayContaining(["material-thin", "rounded-full", "text-caption"])
    )
    expect(
      pill
        ?.querySelector("[data-slot='media-badge-mark'] svg")
        ?.getAttribute("class")
    ).toContain("lucide-image")
  })

  it("sets the circles in the composer density and Recreate as a small glass capsule, so no bare caption sits on the photo", () => {
    renderTile()
    const actions = slot("media-chrome-actions")
    expect(actions?.getAttribute("data-density")).toBe("composer")
    const expand = screen.getByRole("button", { name: "Expand this result" })
    expect(expand.className.split(" ")).toEqual(
      expect.arrayContaining(["material-thin", "shadow-float", "size-icon"])
    )
    const recreate = screen.getByRole("button", {
      name: "Recreate this result",
    })
    expect(
      recreate.closest("[data-density]")?.getAttribute("data-density")
    ).toBe("row")
    expect(recreate.className.split(" ")).toEqual(
      expect.arrayContaining(["material-thin", "rounded-full", "h-field"])
    )
    expect(slot("media")?.innerHTML).not.toMatch(/gradient|bg-scrim/)
  })

  it("insets its chrome 7 px on a card and 10 px in the library", () => {
    renderTile("card")
    expect(slot("media-chrome-facts")?.className.split(" ")).toEqual(
      expect.arrayContaining(["top-s2", "start-s2"])
    )
    cleanup()
    renderTile("library")
    expect(slot("media-chrome-actions")?.className.split(" ")).toEqual(
      expect.arrayContaining(["top-s3", "end-s3"])
    )
  })

  it("rings the whole tile outside its clipping edge when its open target has keyboard focus", () => {
    renderTile()
    const open = screen.getByRole("button", { name: "Open this result" })
    const tile = slot("media")
    expect(open.parentElement).toBe(tile)
    expect(open.hasAttribute("data-cover")).toBe(true)
    expect(open.className.split(" ")).toContain("focus-visible:outline-none")
    expect(tile?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "overflow-hidden",
        "has-[>[data-cover]:focus-visible]:outline-solid",
        "has-[>[data-cover]:focus-visible]:outline-offset-(--spacing-focus-ring)",
      ])
    )
  })

  it("opens from its open target and from Expand, and recreates from Recreate", () => {
    const calls = renderTile()
    fireEvent.click(screen.getByRole("button", { name: "Open this result" }))
    fireEvent.click(screen.getByRole("button", { name: "Expand this result" }))
    fireEvent.click(
      screen.getByRole("button", { name: "Recreate this result" })
    )
    expect(calls.open).toHaveBeenCalledTimes(2)
    expect(calls.recreate).toHaveBeenCalledTimes(1)
  })

  it("keeps the sound control at the bottom start, clear of Recreate at the bottom end", () => {
    renderTile("card", <button type="button">Sound</button>)
    expect(slot("result-tile-sound")?.className.split(" ")).toEqual(
      expect.arrayContaining(["start-s2", "bottom-s2"])
    )
    expect(slot("media-chrome-action")?.className.split(" ")).toEqual(
      expect.arrayContaining(["end-s2", "bottom-s2"])
    )
  })

  it("shows its app alone and never a dangling separator", () => {
    for (const model of [undefined, ""]) {
      render(
        <ResultTile
          kind="image"
          src="result.png"
          alt="A red bicycle"
          aspect={{ width: 1, height: 1 }}
          app="Image"
          {...(model === undefined ? {} : { model })}
          openLabel="Open this result"
          expandLabel="Expand this result"
          moreLabel="More actions"
          recreateLabel="Recreate"
          recreateName="Recreate this result"
          onOpen={vi.fn()}
          onRecreate={vi.fn()}
        />
      )
      expect(slot("media-chrome-facts")?.textContent).toBe("Image")
      cleanup()
    }
  })

  it("takes no pointer events on the facts, and none on the circles or Recreate while they are hidden at rest", () => {
    renderTile()
    expect(slot("media-chrome-facts")?.className.split(" ")).toContain(
      "pointer-events-none"
    )
    for (const group of [
      slot("media-chrome-actions"),
      slot("media-chrome-action"),
    ]) {
      expect(group?.className.split(" ")).toEqual(
        expect.arrayContaining([
          "pointer-events-none",
          "group-hover/reveal:pointer-events-auto",
          "group-focus-within/reveal:pointer-events-auto",
        ])
      )
    }
  })
})
