import { Canvas, StepCards } from "@rosesfield/ui/components/canvas"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("Canvas", () => {
  it("keeps the space of its cluster but hides it until you have runs", () => {
    render(
      <Canvas
        label="Output"
        tabs={<span>Tabs</span>}
        cluster={<span>View</span>}
        hasRuns={false}
      >
        <p>Empty</p>
      </Canvas>
    )
    const canvas = screen.getByRole("region", { name: "Output" })
    const head = canvas.querySelector("[data-slot='canvas-head']")
    expect(head?.className.split(" ")).toEqual(
      expect.arrayContaining(["min-h-14", "pt-2", "pb-3", "px-4"])
    )
    const cluster = canvas.querySelector("[data-slot='canvas-cluster']")
    expect(cluster?.className.split(" ")).toEqual(
      expect.arrayContaining(["invisible", "@max-regular:hidden"])
    )
    expect(cluster?.getAttribute("aria-hidden")).toBe("true")
  })

  it("puts the cluster on its own right-aligned row on a phone", () => {
    render(
      <Canvas
        label="Output"
        tabs={<span>Tabs</span>}
        cluster={<span>View</span>}
        hasRuns
      >
        <p>Runs</p>
      </Canvas>
    )
    const cluster = document.querySelector("[data-slot='canvas-cluster']")
    expect(cluster?.parentElement?.className.split(" ")).toContain("flex-wrap")
    expect(cluster?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "@max-regular:w-full",
        "@max-regular:justify-end",
      ])
    )
  })

  it("shows the cluster once you have runs", () => {
    render(
      <Canvas
        label="Output"
        tabs={<span>Tabs</span>}
        cluster={<span>View</span>}
        hasRuns
      >
        <p>Runs</p>
      </Canvas>
    )
    const cluster = document.querySelector("[data-slot='canvas-cluster']")
    expect(cluster?.className.split(" ")).not.toContain("invisible")
  })
})

describe("StepCards", () => {
  it("stands three steps in equal columns 40 px apart, each a frame over a heading and a sentence", () => {
    render(
      <StepCards
        title="How it works"
        line="Three steps"
        steps={["one", "two", "three"].map((id) => ({
          id,
          title: `Step ${id}`,
          line: `Do ${id}`,
          media: <img alt="" src={`${id}.png`} />,
        }))}
      />
    )
    const list = screen.getByRole("list")
    expect(list.className.split(" ")).toEqual(
      expect.arrayContaining(["grid-cols-3", "gap-10"])
    )
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3)
  })

  it("frames each step at 1.316 to 1, 48 px from the canvas's sides once the stage's 16 px inset is counted", () => {
    render(
      <StepCards
        title="How it works"
        line="Three steps"
        steps={[{ id: "one", title: "Step", line: "Do", media: null }]}
      />
    )
    const lead = document.querySelector("[data-slot='state-view-lead']")
    expect(lead?.className.split(" ")).toEqual(
      expect.arrayContaining(["px-12", "@regular:px-8", "py-24"])
    )
    const frame = screen.getByRole("listitem").firstElementChild
    expect(frame?.className.split(" ")).toContain("aspect-[25/19]")
  })

  it("sets its heading and line at the start, flush with the cards, and never breaks a word inside a card", () => {
    render(
      <StepCards
        title="How it works"
        line="Three steps"
        steps={[{ id: "one", title: "Step", line: "Do", media: null }]}
      />
    )
    const lead = document.querySelector("[data-slot='state-view-lead']")
    expect(lead?.className.split(" ")).toContain("text-start")
    expect(lead?.className.split(" ")).not.toContain("text-center")
    expect(screen.getByRole("list").className.split(" ")).toContain(
      "wrap-normal"
    )
  })
})

describe("Canvas scroll and inset", () => {
  it("leaves the ring room above the first row, so a first-row tile's focus ring shows whole", () => {
    render(
      <Canvas label="Output" tabs={<span>Tabs</span>} hasRuns>
        <p>Runs</p>
      </Canvas>
    )
    const scroll = document.querySelector("[data-slot='canvas-scroll']")
    expect(scroll?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "overflow-y-auto",
        "-mt-[calc(var(--spacing-focus-ring)*2)]",
        "pt-[calc(var(--spacing-focus-ring)*2)]",
      ])
    )
  })

  it("puts its head row on the page's own edge when it sits in the page gutter", () => {
    render(
      <Canvas label="History" tabs={<span>Tabs</span>} hasRuns inset="page">
        <p>Runs</p>
      </Canvas>
    )
    const head = document.querySelector("[data-slot='canvas-head']")
    const classes = head?.className.split(" ") ?? []
    expect(classes).toContain("px-0")
    expect(classes).not.toContain("px-4")
  })
})
