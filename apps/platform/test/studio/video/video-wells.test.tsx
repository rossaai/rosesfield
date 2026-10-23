import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import type { AppForm } from "@/screens/app/use-app-form"
import type { ImageSlots } from "@/studio/video/video-tabs"
import { ElementsChip, VideoWells } from "@/studio/video/video-wells"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

function formOf(inputs: Record<string, FieldValue> = {}): AppForm {
  return {
    values: { inputs, seedMode: "random", count: 1, aspectRatio: null },
    problems: new Map(),
    setInput: () => undefined,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
}

const references: ImageSlots = {
  start: null,
  references: { name: "references", max: 4 },
  last: null,
}

const startOnly: ImageSlots = {
  start: { name: "firstFrame", max: 1 },
  references: null,
  last: null,
}

function show(node: ReactElement): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{node}</TooltipProvider>
    </QueryClientProvider>
  )
}

function zone(title: string): HTMLElement {
  const name = (text: string): boolean =>
    text.replace(/\s/g, "") === title.replace(/\s/g, "")
  return screen.getByRole("button", { name })
}

describe("Video's image wells", () => {
  it("shows the References drop zone with one large glyph, its name and the kind it takes, with no caption or note above it", () => {
    show(<VideoWells slots={references} form={formOf()} />)
    const drop = zone(tCatalog("video.well.references"))
    expect(drop.querySelectorAll("svg")).toHaveLength(1)
    expect(document.querySelector('[data-slot="field-caption"]')).toBeNull()
    expect(document.querySelector('[data-slot="field-note"]')).toBeNull()
  })

  it("shows one disc on a well that takes one image", () => {
    show(<VideoWells slots={startOnly} form={formOf()} />)
    expect(
      zone(tCatalog("video.well.start")).querySelectorAll("svg")
    ).toHaveLength(1)
  })
})

describe("the Elements chip in Video's prompt", () => {
  it("offers the library for the open tab's images and stops when the slot is full", () => {
    show(<ElementsChip slots={references} form={formOf()} />)
    expect(
      screen.getByRole("button", { name: t("bar.elements") })
    ).toHaveProperty("disabled", false)
    cleanup()
    show(
      <ElementsChip
        slots={startOnly}
        form={formOf({ firstFrame: [assetId] })}
      />
    )
    expect(
      screen.getByRole("button", { name: t("bar.elements") })
    ).toHaveProperty("disabled", true)
  })

  it("is absent where the tab takes no image", () => {
    show(
      <ElementsChip
        slots={{ start: null, references: null, last: null }}
        form={formOf()}
      />
    )
    expect(screen.queryByRole("button", { name: t("bar.elements") })).toBeNull()
  })
})

describe("a group of hosted fields", () => {
  it("draws nothing when no field in it shows, so it adds no gap to the column", () => {
    const { container } = render(<HostedFields fields={[]} form={formOf()} />)
    expect(container.childElementCount).toBe(0)
  })
})

describe("Two frames' wells", () => {
  it("stands the first and the last frame side by side in two columns 8 px apart, so the tab fits the column", () => {
    show(
      <VideoWells
        slots={{
          start: { name: "firstFrame", max: 1 },
          references: null,
          last: { name: "lastFrame", max: 1 },
        }}
        form={formOf()}
      />
    )
    const wells = document.querySelector("[data-slot='video-wells']")
    expect(wells?.className.split(" ")).toEqual(
      expect.arrayContaining(["grid", "grid-cols-2", "gap-2"])
    )
    expect(wells?.childElementCount).toBe(2)
    expect(zone(tCatalog("video.well.first"))).toBeTruthy()
    expect(zone(tCatalog("video.well.last"))).toBeTruthy()
  })

  it("keeps one well a column when the tab takes one image", () => {
    show(<VideoWells slots={startOnly} form={formOf()} />)
    const wells = document.querySelector("[data-slot='video-wells']")
    expect(wells?.className.split(" ")).not.toContain("grid")
  })
})
