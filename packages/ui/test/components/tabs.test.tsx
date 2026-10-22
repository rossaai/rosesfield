import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function classesOf(element: Element): string[] {
  return element.className.split(" ")
}

describe("tabs", () => {
  it("export one pane switch, with no second strip or segmented tab", async () => {
    const tabs = await import("@rosesfield/ui/components/tabs")
    expect(Object.keys(tabs).sort()).toEqual([
      "Tabs",
      "TabsContent",
      "TabsList",
      "TabsTrigger",
    ])
  })

  it("set each tab as a 30 px capsule at the body size", () => {
    render(
      <Tabs defaultValue="one">
        <TabsList aria-label="Panes">
          <TabsTrigger value="one">History</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(classesOf(screen.getByRole("tab", { name: "History" }))).toEqual(
      expect.arrayContaining(["h-tab", "rounded-full", "text-body"])
    )
  })
})

describe("TabsList", () => {
  it("tints the current tab with one plate that travels, never a tint of each tab", () => {
    render(
      <Tabs defaultValue="all">
        <TabsList aria-label="Kind">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const list = screen.getByRole("tablist", { name: "Kind" })
    const plate = list.querySelector("[data-slot='tabs-indicator']")
    expect(plate?.className.split(" ")).toEqual(
      expect.arrayContaining(["bg-(--tint)", "rounded-full", "motion-travel"])
    )
    const video = screen.getByRole("tab", { name: "Video" })
    expect(classesOf(video)).not.toContain("data-active:bg-(--tint)")
    expect(classesOf(video)).toContain("z-1")
  })
})
