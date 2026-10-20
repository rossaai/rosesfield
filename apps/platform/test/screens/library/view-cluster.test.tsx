import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, type Mock, vi } from "vitest"
import { SoundButton } from "@/screens/library/result-grid"
import {
  type FilterGroup,
  ViewCluster,
  type ViewLayout,
} from "@/screens/library/view-cluster"

afterEach(cleanup)

function renderCluster(groups: readonly FilterGroup[]): {
  onLayout: Mock<(layout: ViewLayout) => void>
} {
  const onLayout = vi.fn<(layout: ViewLayout) => void>()
  render(
    <TooltipProvider>
      <ViewCluster
        layout="list"
        onLayout={onLayout}
        size={2}
        onSize={() => undefined}
        groups={groups}
      />
    </TooltipProvider>
  )
  return { onLayout }
}

const kindGroup = (onChoose: (value: string) => void): FilterGroup => ({
  id: "kind",
  name: "Kind",
  icon: null,
  choices: [
    { value: "all", label: "All", picture: <svg data-testid="all" /> },
    { value: "image", label: "Images", picture: <svg /> },
    { value: "video", label: "Video", picture: <svg /> },
  ],
  value: "all",
  onChoose,
})

describe("the head row's cluster", () => {
  it("holds a size slider, List and Grid as two tabs on a well, and Filter after them", () => {
    const { onLayout } = renderCluster([kindGroup(() => undefined)])
    const pill = document.querySelector("[data-slot='view-pill']")
    const slider = screen.getByRole("slider", { hidden: true })
    expect(screen.getByLabelText("Tile size")).toBe(slider)
    expect(pill?.firstElementChild?.contains(slider)).toBe(true)
    const switcher = screen.getByRole("tablist", { name: "Layout" })
    expect(switcher.getAttribute("data-form")).toBe("well")
    const cells = screen.getAllByRole("tab")
    expect(cells.map((cell) => cell.textContent)).toEqual(["List", "Grid"])
    const list = screen.getByRole("tab", { name: "List" })
    expect(list.getAttribute("aria-selected")).toBe("true")
    expect(list.getAttribute("tabindex")).toBe("0")
    expect(screen.queryAllByRole("radio")).toEqual([])
    fireEvent.click(screen.getByRole("tab", { name: "Grid" }))
    expect(onLayout).toHaveBeenCalledWith("grid")
    const filter = screen.getByRole("button", { name: "Filter" })
    expect(pill?.nextElementSibling?.contains(filter)).toBe(true)
  })

  it("opens Filter on groups that show their count while closed", async () => {
    const onChoose = vi.fn<(value: string) => void>()
    renderCluster([kindGroup(onChoose)])
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Filter" }))
    })
    const count = await screen.findByText("· 3")
    expect(count.getAttribute("data-slot")).toBe("setting-group-count")
    const trigger = screen.getByRole("button", { name: /Kind/ })
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    await act(async () => {
      fireEvent.click(trigger)
    })
    const images = await screen.findByRole("button", { name: "Images" })
    expect(images.getAttribute("data-slot")).toBe("setting-choice")
    expect(images.getAttribute("aria-pressed")).toBe("false")
    const all = screen.getByRole("button", { name: "All" })
    expect(all.getAttribute("aria-pressed")).toBe("true")
    expect(all.contains(screen.getByTestId("all"))).toBe(true)
    fireEvent.click(images)
    expect(onChoose).toHaveBeenCalledWith("image")
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
