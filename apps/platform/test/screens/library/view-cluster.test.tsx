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
    { value: "all", label: "All" },
    { value: "image", label: "Images" },
    { value: "video", label: "Video" },
  ],
  value: "all",
  onChoose,
})

describe("the head row's cluster", () => {
  it("holds a size slider, List and Grid as two cells, and Filter after them", () => {
    const { onLayout } = renderCluster([kindGroup(() => undefined)])
    const size = screen.getByRole("group", { name: "Tile size" })
    expect(size.querySelector("[role='slider']")).not.toBeNull()
    const cells = screen.getAllByRole("radio")
    expect(cells.map((cell) => cell.textContent)).toEqual(["List", "Grid"])
    const list = screen.getByRole("radio", { name: "List" })
    expect(list.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(screen.getByRole("radio", { name: "Grid" }))
    expect(onLayout).toHaveBeenCalledWith("grid")
    const filter = screen.getByRole("button", { name: "Filter" })
    const pill = document.querySelector("[data-slot='view-pill']")
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
    fireEvent.click(await screen.findByRole("button", { name: "Images" }))
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
