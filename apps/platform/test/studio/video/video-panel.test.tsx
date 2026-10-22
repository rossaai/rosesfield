import { findApp } from "@rosesfield/catalog"
import { appListing } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { AppForm } from "@/screens/app/use-app-form"
import { SoundChip, VideoChips } from "@/studio/video/video-chips"
import { videoFieldsOf } from "@/studio/video/video-fields"
import { MakeSwitch } from "@/studio/video/video-panel"

afterEach(cleanup)

const video = appListing.parse(findApp("video"))

const form: AppForm = {
  values: { inputs: {}, seedMode: "random", count: 1, aspectRatio: null },
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
}

describe("the prompt's chip row", () => {
  it("holds Sound as a 26 px chip", () => {
    render(
      <TooltipProvider>
        <SoundChip form={form} fields={null} isGraph makesSound={false} />
      </TooltipProvider>
    )
    const chip = screen.getByRole("button", { pressed: true })
    expect(chip.className.split(" ")).toContain("h-6.5")
  })
})

describe("the setting tiles", () => {
  it("draw no row when the model sets no length, format or resolution, so the column keeps one 8 px gap", () => {
    const { container } = render(
      <TooltipProvider>
        <VideoChips app={video} form={form} fields={videoFieldsOf([])} />
      </TooltipProvider>
    )
    expect(container.querySelector("[data-slot='setting-tiles']")).toBeNull()
    expect(container.childElementCount).toBe(0)
  })
})

describe("the column's mode switch", () => {
  it("is a 26 px two-cell switch with an ink thumb on the track, Video chosen, with Extend sending you to the app that extends a clip", () => {
    const onExtend = vi.fn()
    render(<MakeSwitch onExtend={onExtend} />)
    const group = screen.getByRole("radiogroup", {
      name: tCatalog("videoEdit.input.mode.label"),
    })
    const cells = screen.getAllByRole("radio")
    expect(cells.map((cell) => cell.textContent)).toEqual([
      t("kind.video"),
      tCatalog("videoEdit.choice.mode.extend"),
    ])
    expect(cells[0]?.getAttribute("aria-checked")).toBe("true")
    expect(group.className.split(" ")).toEqual(
      expect.arrayContaining(["h-button-small", "bg-track", "rounded-full"])
    )
    expect(
      group.querySelector("[data-slot='segmented-control-thumb']")?.className
    ).toContain("bg-ink")
    expect(document.querySelector("[data-slot='make-switch']")?.className).toBe(
      "mb-2"
    )
    fireEvent.click(cells[1] as HTMLElement)
    expect(onExtend).toHaveBeenCalledTimes(1)
    fireEvent.click(cells[0] as HTMLElement)
    expect(onExtend).toHaveBeenCalledTimes(1)
  })
})

describe("the column's mode switch on the keyboard", () => {
  it("keeps you on Video when an arrow key reaches Extend, and leaves only on a click or a press", () => {
    const onExtend = vi.fn()
    render(<MakeSwitch onExtend={onExtend} />)
    const [video, extend] = screen.getAllByRole("radio")
    if (video === undefined || extend === undefined) {
      throw new Error("the switch has no two cells")
    }
    video.focus()
    fireEvent.keyDown(video, { key: "ArrowRight" })
    extend.focus()
    expect(onExtend).not.toHaveBeenCalled()
    expect(video.getAttribute("aria-checked")).toBe("true")
    fireEvent.keyDown(extend, { key: " " })
    fireEvent.click(extend)
    expect(onExtend).toHaveBeenCalledTimes(1)
  })
})
