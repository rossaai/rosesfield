import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, type Mock, vi } from "vitest"
import { t } from "@/copy/t"
import { SoundButton } from "@/screens/library/result-grid"
import {
  appFilterGroups,
  type FilterGroup,
  type ViewLayout,
  ViewMenu,
} from "@/screens/library/view-cluster"

afterEach(cleanup)

function renderView(
  layout: ViewLayout,
  groups: readonly FilterGroup[],
  isLoading = false
): { onLayout: Mock<(layout: ViewLayout) => void> } {
  const onLayout = vi.fn<(layout: ViewLayout) => void>()
  render(
    <TooltipProvider>
      <ViewMenu
        layout={layout}
        onLayout={onLayout}
        size={1}
        onSize={() => undefined}
        groups={groups}
        isLoading={isLoading}
      />
    </TooltipProvider>
  )
  return { onLayout }
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

describe("the View filter's app groups", () => {
  it("gives the Characters group its own all value, not All apps", () => {
    const groups = appFilterGroups(null, () => undefined)
    const characters = groups.find((group) => group.id === "app-character")
    const image = groups.find((group) => group.id === "app-image")
    expect(characters?.choices[0]?.label).toBe(t("kind.all"))
    expect(image?.choices[0]?.label).toBe(t("history.filter.allApps"))
  })
})

describe("the View menu", () => {
  it("is one View button whose menu holds the layout, a size slider in Grid, and Filter as submenus", async () => {
    const { onLayout } = renderView("grid", [appGroup(() => undefined)])
    expect(screen.getAllByRole("button")).toHaveLength(1)
    await openView()
    const items = await screen.findAllByRole("menuitemradio")
    expect(items.map((item) => item.textContent)).toEqual(["List", "Grid"])
    expect(screen.getByRole("slider", { hidden: true })).toBeTruthy()
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

  it("stands as a disabled View of the same shape while the list loads", () => {
    renderView("grid", [], true)
    const view = screen.getByRole("button", { name: "View" })
    expect(view).toHaveProperty("disabled", true)
    expect(view.getAttribute("data-slot")).toBe("view-menu")
  })
})

describe("a clip's sound button", () => {
  it("turns its clip's sound on and off", () => {
    render(
      <TooltipProvider>
        <div data-slot="grid-item">
          <video muted />
          <SoundButton />
        </div>
      </TooltipProvider>
    )
    const video = document.querySelector("video")
    if (video === null) {
      throw new Error("no video")
    }
    video.muted = true
    fireEvent.click(screen.getByRole("button", { name: "Turn sound on" }))
    expect(video.muted).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Turn sound off" }))
    expect(video.muted).toBe(true)
  })
})
