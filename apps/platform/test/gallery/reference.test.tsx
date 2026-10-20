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
