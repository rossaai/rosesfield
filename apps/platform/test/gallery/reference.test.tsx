import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { referenceControlEntries } from "@/gallery/entries/reference-controls"
import { referenceCreateEntries } from "@/gallery/entries/reference-create"
import { referenceMediaEntries } from "@/gallery/entries/reference-media"
import { referenceShellEntries } from "@/gallery/entries/reference-shell"
import { ReferenceFrames } from "@/gallery/reference-frames"

afterEach(cleanup)

const entries = [
  ...referenceControlEntries,
  ...referenceCreateEntries,
  ...referenceMediaEntries,
  ...referenceShellEntries,
]

const inventory = [
  "foundations",
  "top-bar",
  "nav-link",
  "phone-tab-bar",
  "footer",
  "button",
  "icon-button",
  "tabs",
  "filter-chips",
  "badge",
  "prompt-bar",
  "input-panel",
  "model-picker",
  "setting-chips",
  "generate-button",
  "upload-zone",
  "canvas-and-history",
  "image-card",
  "video-tile",
  "effect-tile",
  "app-tile",
  "promo-card",
  "gallery-grid",
  "media-row",
  "media-viewer",
  "hero",
  "section-header",
]

const left = ["pricing-card", "dialog", "notice"]

describe("the reference gallery", () => {
  it("holds one entry for each of the 27 units Rosesfield uses, and none it leaves", () => {
    const units = entries.map((entry) => entry.unit)
    expect([...units].sort()).toEqual([...inventory].sort())
    for (const unit of left) {
      expect(units).not.toContain(unit)
    }
  })

  it("frames every state, and forces hover, press and focus where it names them", () => {
    for (const entry of entries) {
      expect(entry.states.length).toBeGreaterThan(0)
      for (const state of entry.states) {
        expect(state.placement).toBe("frame")
        if (["hover", "press", "focus"].includes(state.id)) {
          expect(state.force).toBe(state.id)
        }
      }
    }
  })

  it.each(
    entries.flatMap((entry) =>
      entry.states.map((state) => [entry.id, state.id, state] as const)
    )
  )("renders %s in its %s state", (_entry, _state, state) => {
    const { container } = render(state.render())
    expect(container.firstElementChild).not.toBeNull()
  })

  it("places a frame at 1440 by 900 and one at 390 px, and names the capture it waits for", () => {
    const entry = referenceControlEntries[1]
    const state = entry?.states[0]
    if (entry === undefined || state === undefined) {
      throw new Error("no button entry")
    }
    render(
      <ReferenceFrames entry={entry} state={state} src="?entry=ref-button" />
    )
    const frames = document.querySelectorAll("iframe")
    expect([...frames].map((frame) => frame.className.split(" ")[0])).toEqual([
      "h-225",
      "h-211",
    ])
    const captures = [
      ...document.querySelectorAll("[data-slot='reference-capture']"),
    ]
    expect(captures).toHaveLength(2)
    const names = ["button-rest.png", "button-rest-phone.png"]
    for (const [index, capture] of captures.entries()) {
      const name = names[index] ?? ""
      const shown =
        capture.getAttribute("data-present") === "yes"
          ? capture.getAttribute("alt")
          : capture.textContent
      expect(shown).toContain(name)
    }
  })
})

function stateOf(id: string, state: string) {
  const found = referenceControlEntries
    .find((entry) => entry.id === id)
    ?.states.find((one) => one.id === state)
  if (found === undefined) {
    throw new Error(`no ${id} ${state}`)
  }
  return found
}

describe("the controls gallery", () => {
  it("sets the hero pair 8 px apart at the gutter on a phone and at the row's right end on a desktop", () => {
    const { container } = render(stateOf("ref-button", "rest").render())
    const pair = container.querySelector("[data-slot='hero-pair']")
    expect(pair?.className.split(" ")).toEqual(
      expect.arrayContaining(["gap-2", "self-stretch", "@regular:justify-end"])
    )
    expect(pair?.querySelectorAll("button")).toHaveLength(2)
  })

  it("shows a chip with its tag and an open group of picture cards with one current", () => {
    const { container } = render(stateOf("ref-filter-chips", "open").render())
    expect(
      container.querySelectorAll("[data-slot='inline-chip-tag']")
    ).toHaveLength(1)
    const cards = [
      ...container.querySelectorAll("[data-slot='setting-choice']"),
    ]
    expect(cards).toHaveLength(4)
    expect(
      cards.filter((card) => card.getAttribute("aria-pressed") === "true")
    ).toHaveLength(1)
    for (const card of cards) {
      expect(
        card.querySelector("[data-slot='setting-choice-picture'] svg")
      ).not.toBeNull()
    }
  })
})

describe("the create gallery", () => {
  it("joins the column's prompt to its chip row: Elements with its at-sign, then Sound", () => {
    const entry = referenceCreateEntries.find(
      (one) => one.id === "ref-input-panel"
    )
    const rest = entry?.states.find((one) => one.id === "rest")
    if (rest === undefined) {
      throw new Error("no ref-input-panel rest")
    }
    const { container } = render(rest.render())
    const block = container.querySelector("[data-slot='composer-prompt-block']")
    const chips = [
      ...(block?.querySelectorAll("[data-slot='chip']") ?? []),
    ].map((chip) => chip.textContent)
    expect(chips).toEqual(["Elements", "Sound"])
    expect(block?.querySelector(".lucide-at-sign")).not.toBeNull()
  })
})
