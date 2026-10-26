import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { type ReactElement, useState } from "react"
import { afterEach, describe, expect, it, type Mock, vi } from "vitest"
import { t } from "@/copy/t"
import type { PlaceView, ViewLayout } from "@/pieces/view/use-view"
import { type FilterGroup, ViewBar, ViewMenu } from "@/pieces/view/view-bar"

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

function placeView(layout: ViewLayout, words = ""): PlaceView {
  return {
    layout,
    size: 1,
    words,
    setLayout: vi.fn(),
    setSize: vi.fn(),
    setWords: vi.fn(),
  }
}

function renderView(
  layout: ViewLayout,
  groups: readonly FilterGroup[],
  isLoading = false
): { onLayout: Mock } {
  const view = placeView(layout)
  render(
    <TooltipProvider>
      <ViewMenu view={view} groups={groups} isLoading={isLoading} />
    </TooltipProvider>
  )
  return { onLayout: vi.mocked(view.setLayout) }
}

const appGroup = (onChoose: (value: string) => void): FilterGroup => ({
  id: "app-image",
  name: "Image",
  icon: null,
  choices: [
    { value: "", label: "All apps", picture: <svg data-testid="all" /> },
    { value: "relight", label: "Relight", picture: <svg /> },
  ],
  value: "",
  onChoose,
})

async function openView(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "View" }))
  })
}

describe("the View menu", () => {
  it("is one View button whose menu holds the layout, a four-step size slider in Grid, and Filter as submenus", async () => {
    const { onLayout } = renderView("grid", [appGroup(() => undefined)])
    expect(screen.getAllByRole("button")).toHaveLength(1)
    await openView()
    const items = await screen.findAllByRole("menuitemradio")
    expect(items.map((item) => item.textContent)).toEqual(["List", "Grid"])
    const slider = screen.getByRole("slider", { hidden: true })
    expect(slider.getAttribute("min")).toBe("0")
    expect(slider.getAttribute("max")).toBe("3")
    expect(slider.getAttribute("value")).toBe("1")
    const facet = screen.getByRole("menuitem", { name: /Image/ })
    expect(facet.getAttribute("data-slot")).toBe("dropdown-menu-sub-trigger")
    expect(facet.textContent).toContain("All apps")
    expect(document.querySelector("[data-slot='popover-content']")).toBeNull()
    fireEvent.click(items[0] as HTMLElement)
    expect(onLayout).toHaveBeenCalledWith("list")
  })

  it("shows no size slider in List, where the size changes nothing", async () => {
    renderView("list", [])
    await openView()
    await screen.findAllByRole("menuitemradio")
    expect(screen.queryByRole("slider", { hidden: true })).toBeNull()
  })

  it("shows the size alone for a place with one layout", async () => {
    render(
      <TooltipProvider>
        <ViewMenu view={placeView("grid")} hasLayout={false} />
      </TooltipProvider>
    )
    await openView()
    const slider = await screen.findByRole("slider", { hidden: true })
    expect(slider.getAttribute("max")).toBe("3")
    expect(screen.queryAllByRole("menuitemradio")).toHaveLength(0)
  })

  it("stands as a disabled View of the same shape while the list loads", () => {
    renderView("grid", [], true)
    const view = screen.getByRole("button", { name: "View" })
    expect(view).toHaveProperty("disabled", true)
    expect(view.getAttribute("data-slot")).toBe("view-menu")
  })
})

function KeptWords(): ReactElement {
  const [words, setWords] = useState("")
  return (
    <TooltipProvider>
      <p data-testid="words">{words}</p>
      <ViewBar
        view={{ ...placeView("grid"), words, setWords }}
        searchLabel={t("history.search.label")}
      />
    </TooltipProvider>
  )
}

describe("the view bar", () => {
  it("opens the place's search field from Search beside View, and closing it clears the words", () => {
    render(<KeptWords />)
    const open = screen.getByRole("button", { name: t("library.search.open") })
    expect(screen.getByRole("button", { name: "View" })).toBeTruthy()
    expect(screen.queryByRole("searchbox")).toBeNull()
    fireEvent.click(open)
    const field = screen.getByRole("searchbox", {
      name: t("history.search.label"),
    })
    expect(document.activeElement).toBe(field)
    expect(open.getAttribute("aria-expanded")).toBe("true")
    fireEvent.change(field, { target: { value: "red door" } })
    expect(screen.getByTestId("words").textContent).toBe("red door")
    fireEvent.click(open)
    expect(screen.queryByRole("searchbox")).toBeNull()
    expect(screen.getByTestId("words").textContent).toBe("")
  })

  it("shows the field at once when the place opens with words", () => {
    render(
      <TooltipProvider>
        <ViewBar
          view={placeView("grid", "fog")}
          searchLabel={t("library.search.label")}
        />
      </TooltipProvider>
    )
    const field = screen.getByRole("searchbox", {
      name: t("library.search.label"),
    })
    expect(field).toHaveProperty("value", "fog")
  })

  it("keeps Search and View to their icons on a phone, so the bar fits beside the tabs", () => {
    asPhone()
    render(<KeptWords />)
    const open = screen.getByRole("button", { name: t("library.search.open") })
    expect(open.textContent).toBe("")
    expect(screen.getByRole("button", { name: "View" }).textContent).toBe("")
    fireEvent.click(open)
    const field = screen.getByRole("searchbox")
    expect(field.className.split(" ")).toEqual(
      expect.arrayContaining(["order-last", "basis-full"])
    )
  })
})
