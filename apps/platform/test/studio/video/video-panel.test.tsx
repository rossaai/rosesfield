import { findApp } from "@rosesfield/catalog"
import { appListing } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { AppForm } from "@/screens/app/use-app-form"
import { SoundChip, VideoSettings } from "@/studio/video/video-chips"
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
    expect(chip.className.split(" ")).toContain("h-button-small")
  })
})

describe("the column's settings", () => {
  it("draw a model's resolution and length as dropdowns in the plan's order, the seed closed under Advanced, and a setting the table does not know nowhere", () => {
    const fields = videoFieldsOf([
      {
        kind: "choice",
        name: "resolution",
        path: "resolution",
        required: false,
        options: ["720p", "1080p"],
        default: "720p",
      },
      {
        kind: "choice",
        name: "duration",
        path: "duration",
        required: false,
        options: [5, 10],
        default: 5,
      },
      {
        kind: "toggle",
        name: "fancyKnob",
        path: "fancyKnob",
        required: false,
        default: false,
      },
      {
        kind: "number",
        name: "seed",
        path: "seed",
        required: false,
        min: 0,
        max: 100,
        integer: true,
        default: null,
      },
    ])
    render(
      <TooltipProvider>
        <VideoSettings
          app={video}
          form={form}
          fields={fields}
          lastSeed={null}
          placed={[]}
        />
      </TooltipProvider>
    )
    expect(screen.queryByRole("radiogroup")).toBeNull()
    expect(
      screen
        .getAllByRole("combobox")
        .map((one) => one.getAttribute("aria-label"))
    ).toEqual([
      tCatalog("model.field.resolution"),
      tCatalog("model.field.duration"),
    ])
    expect(screen.queryByRole("switch")).toBeNull()
    expect(
      screen.getByRole("button", { name: t("field.advanced") })
    ).toBeTruthy()
    expect(document.querySelector("[data-slot='setting-tiles']")).toBeNull()
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
      ""
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
