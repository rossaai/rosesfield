import { cleanup, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  PhoneTitleProvider,
  ScreenHeader,
  usePhoneTitleSlot,
} from "@/shell/screen-header"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.documentElement.style.removeProperty("--container-regular")
})

function asPhone(): void {
  document.documentElement.style.setProperty("--container-regular", "768px")
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

function BarSlot(): ReactElement {
  const slot = usePhoneTitleSlot()
  return (
    <div data-testid="bar">
      {slot.titles > 0 ? (
        <span ref={slot.setNode} data-testid="slot" />
      ) : (
        <span data-testid="lockup" />
      )}
    </div>
  )
}

function renderWithBar(header: ReactElement): void {
  render(
    <PhoneTitleProvider>
      <BarSlot />
      <main>{header}</main>
    </PhoneTitleProvider>
  )
}

describe("the screen header", () => {
  it("ranks the page title at the display size on a wide window", () => {
    render(<ScreenHeader title="Library" />)
    const title = screen.getByRole("heading", { name: "Library" })
    expect(title.className.split(" ")).toContain("text-display")
    expect(title.className.split(" ")).not.toContain("text-body")
    const header = title.closest("header")
    expect(header?.className.split(" ")).toContain("min-h-header")
    expect(header?.className.split(" ")).not.toContain("sticky")
  })

  it("puts a phone's title and circles in the top bar in place of the lockup, with no second row", async () => {
    asPhone()
    renderWithBar(
      <ScreenHeader
        title="Library"
        phoneTitle="Your library"
        phoneAction={<button type="button">Filter</button>}
      />
    )
    const slot = await screen.findByTestId("slot")
    expect(screen.queryByTestId("lockup")).toBeNull()
    expect(slot.querySelector("h1")?.textContent).toBe("Your library")
    expect(slot.contains(screen.getByRole("button", { name: "Filter" }))).toBe(
      true
    )
    const main = document.querySelector("main")
    expect(main?.querySelectorAll("header")).toHaveLength(1)
  })

  it("puts the phone lead before the title and the phone action after it", async () => {
    asPhone()
    renderWithBar(
      <ScreenHeader
        title="Agent"
        phoneLead={<button type="button">Conversations</button>}
        phoneAction={<button type="button">More</button>}
      />
    )
    const slot = await screen.findByTestId("slot")
    const order = [...slot.querySelectorAll("button, h1")].map(
      (node) => node.textContent
    )
    expect(order).toEqual(["Conversations", "Agent", "More"])
  })

  it("leaves the lockup in the bar on a wide window and with no title", () => {
    renderWithBar(<ScreenHeader title="Library" />)
    expect(screen.getByTestId("lockup")).toBeTruthy()
    cleanup()
    asPhone()
    renderWithBar(<ScreenHeader title={null} />)
    expect(screen.getByTestId("lockup")).toBeTruthy()
  })
})
