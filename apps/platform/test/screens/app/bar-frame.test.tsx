import type { Run } from "@rosesfield/contract"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { BarChips, BarFrame, type BarPlace } from "@/screens/app/bar-frame"
import {
  asPhone,
  doneRun,
  image,
  resetFrames,
  stubFetch,
  withClient,
} from "./frame-render"

beforeEach(stubFetch)

afterEach(() => {
  cleanup()
  resetFrames()
  vi.restoreAllMocks()
})

function renderDocked(): ReturnType<typeof render> {
  return render(
    withClient(
      <BarFrame
        app={image}
        onUseInputs={() => undefined}
        sheet={[false, () => undefined]}
        settings={null}
        bar={() => <div data-testid="bar-dock" />}
      />,
      image,
      null
    )
  )
}

function coveredBottom(): string | undefined {
  const stage = document.querySelector<HTMLElement>('[data-slot="bar-stage"]')
  return stage?.style.getPropertyValue("--covered-bottom")
}

describe("the bar frame's floating prompt bar", () => {
  it("hands the stage its measured height as the covered bottom, so a focused tile scrolls clear of it", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(124)
    renderDocked()
    expect(screen.getByTestId("bar-dock")).toBeDefined()
    expect(coveredBottom()).toBe("124px")
  })

  it("leaves the covered bottom to the tab bar on a phone, where the prompt bar does not float", () => {
    asPhone()
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(124)
    renderDocked()
    expect(screen.queryByTestId("bar-dock")).toBeNull()
    expect(coveredBottom()).toBe("")
  })
})

describe("the bar frame on a phone", () => {
  it("shows the settings once, in the sheet's body, and the sheet's bar without the chip row", () => {
    asPhone()
    const places: BarPlace[] = []
    render(
      withClient(
        <BarFrame
          app={image}
          onUseInputs={() => undefined}
          sheet={[true, () => undefined]}
          settings={<div data-testid="settings" />}
          bar={(place) => {
            places.push(place)
            return <div data-testid={`bar-${place}`} />
          }}
        />,
        image,
        null
      )
    )
    expect(screen.getAllByTestId("settings")).toHaveLength(1)
    expect(screen.getByTestId("bar-sheet")).toBeDefined()
    expect(screen.queryByTestId("bar-dock")).toBeNull()
    expect(places.every((place) => place === "sheet")).toBe(true)
  })
})

describe("the bar frame with its phone bar docked", () => {
  function renderPhoneDock(
    isOpen: boolean,
    places: BarPlace[],
    runs: readonly Run[] | null = null
  ): void {
    render(
      withClient(
        <BarFrame
          app={image}
          onUseInputs={() => undefined}
          sheet={[isOpen, () => undefined]}
          phone="dock"
          settings={<div data-testid="settings" />}
          bar={(place) => {
            places.push(place)
            return <div data-testid={`bar-${place}`} />
          }}
        />,
        image,
        runs
      )
    )
  }

  it("docks the bar under the canvas on a phone and keeps the sheet for the settings alone", () => {
    asPhone()
    const places: BarPlace[] = []
    renderPhoneDock(true, places)
    const dock = document.querySelector("[data-slot=prompt-dock]")
    expect(dock?.querySelector("[data-testid=bar-phone]")).not.toBeNull()
    expect(screen.getAllByTestId("settings")).toHaveLength(1)
    expect(screen.queryByTestId("bar-sheet")).toBeNull()
    expect(screen.getByText(t("app.inputs.open"))).toBeDefined()
    expect(document.querySelector("[data-slot=app-tools-key]")).toBeNull()
    expect(places.every((place) => place === "phone")).toBe(true)
  })

  it("opens a phone with past runs at the top, the newest first, and never scrolls to the bottom", () => {
    asPhone()
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(900)
    const scrolled = vi.spyOn(Element.prototype, "scrollTop", "set")
    renderPhoneDock(false, [], [doneRun(image.id)])
    expect(scrolled).not.toHaveBeenCalledWith(900)
  })
})

describe("the bar frame's canvas", () => {
  it("reaches the page's edges, so its head row and its feed share the 16 px gutter at every width", () => {
    render(
      withClient(
        <BarFrame
          app={image}
          onUseInputs={() => undefined}
          sheet={[false, () => undefined]}
          settings={null}
          bar={() => null}
        />,
        image,
        null
      )
    )
    const stage = document.querySelector('[data-slot="bar-stage"]')
    const feed = document.querySelector('[data-slot="app-stage-scroll"]')
    const classes = (node: Element | null): string[] =>
      node?.className.split(" ") ?? []
    expect(classes(stage).filter((one) => /^(px|pt|pl|pr)-/.test(one))).toEqual(
      []
    )
    expect(classes(feed)).toContain("px-4")
    expect(classes(feed).some((one) => one.includes(":px-"))).toBe(false)
  })
})

describe("the bar's chips", () => {
  function renderChips(): void {
    render(
      withClient(
        <BarChips
          chips={
            <>
              <button type="button">first chip</button>
              <button type="button">second chip</button>
            </>
          }
        />,
        image,
        null
      )
    )
  }

  it("stand in one row on a regular width", () => {
    renderChips()
    expect(screen.getByRole("button", { name: "first chip" })).toBeDefined()
    expect(document.querySelector("[data-slot=bar-settings]")).toBeNull()
  })

  it("fold into one Settings chip on a phone, so no chip is cut at the row's edge", async () => {
    asPhone()
    renderChips()
    expect(screen.queryByRole("button", { name: "first chip" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: t("bar.settings") }))
    expect(
      await screen.findByRole("button", { name: "second chip" })
    ).toBeDefined()
  })
})
