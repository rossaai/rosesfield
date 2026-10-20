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
      expect.arrayContaining(["h-14", "pt-2", "px-4"])
    )
    const cluster = canvas.querySelector("[data-slot='canvas-cluster']")
    expect(cluster?.className.split(" ")).toContain("invisible")
    expect(cluster?.getAttribute("aria-hidden")).toBe("true")
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
})
