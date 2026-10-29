import { offeredPresets, type VfxPreset } from "@rosesfield/catalog/vfx"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { tCatalog } from "@/copy/t"
import type { MediaReading } from "@/studio/motion/use-media-facts"
import { PresetTiles, presetMediaOf } from "@/studio/vfx/preset-tiles"
import { photoFitOf } from "@/studio/vfx/use-vfx-checks"

afterEach(cleanup)

function presetById(id: string): VfxPreset {
  const preset = offeredPresets.find((one) => one.id === id)
  if (preset === undefined) {
    throw new Error(`${id} is not offered`)
  }
  return preset
}

const runId = "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e"

describe("a VFX preset tile", () => {
  it("plays a photo preset's guide, labelled as the guide, while no run of it is kept", () => {
    render(
      <PresetTiles
        value="grab-and-run"
        onChange={() => undefined}
        register={() => undefined}
      />
    )
    const name = tCatalog("vfx.preset.grabAndRun")
    const clip = screen.getByLabelText(
      tCatalog("vfx.tile.guideAlt", { preset: name })
    )
    expect(clip.getAttribute("src")).toBe("/vfx/guides/grab-and-run.mp4")
    const tile = clip.closest("button")
    expect(tile?.textContent).toContain(tCatalog("vfx.tile.guide"))
    expect(tile?.getAttribute("aria-pressed")).toBe("true")
  })

  it("shows no video for a clip preset with no kept run", () => {
    render(
      <PresetTiles
        value="vanish"
        onChange={() => undefined}
        register={() => undefined}
      />
    )
    const tile = document.querySelector('[data-preset="vanish"]')
    expect(tile?.querySelector("video")).toBeNull()
    expect(tile?.textContent).toContain(tCatalog("vfx.tile.noRun"))
  })

  it("shows a kept run in place of the guide once one exists", () => {
    const kept: VfxPreset = {
      ...presetById("ticket-wipe"),
      result: { runId, file: "ticket-wipe.mp4" },
    }
    expect(presetMediaOf(kept)).toEqual({
      kind: "result",
      src: "/vfx/results/ticket-wipe.mp4",
    })
  })

  it("names no price on a tile", () => {
    render(
      <PresetTiles
        value="vanish"
        onChange={() => undefined}
        register={() => undefined}
      />
    )
    expect(document.querySelector('[data-slot="effect-price"]')).toBeNull()
    expect(document.body.textContent).not.toMatch(/credit/i)
  })

  it("picks a preset on a press", () => {
    const onChange = vi.fn()
    render(
      <PresetTiles
        value="vanish"
        onChange={onChange}
        register={() => undefined}
      />
    )
    const flood = document.querySelector('[data-preset="flood-the-street"]')
    if (flood === null) {
      throw new Error("No Flood the street tile")
    }
    fireEvent.click(flood)
    expect(onChange).toHaveBeenCalledWith("flood-the-street")
  })
})

describe("the photo a photo preset takes", () => {
  const read = (width: number, height: number): MediaReading => ({
    state: "read",
    facts: { mime: "image/png", bytes: 1000, width, height, seconds: null },
  })

  it("passes a photo in the shape of the preset's guide", () => {
    expect(
      photoFitOf(presetById("grab-and-run"), read(1080, 1920), "480p")
    ).toBeNull()
  })

  it("refuses a photo in another shape than the guide, with the reason", () => {
    expect(
      photoFitOf(presetById("grab-and-run"), read(1920, 1080), "480p")
    ).toMatchObject({ name: "photo", key: "field.asset.wrongShape" })
    expect(
      photoFitOf(presetById("ticket-wipe"), read(1080, 1920), "480p")?.key
    ).toBe("field.asset.wrongShape")
  })
})
