import { Slider } from "@rosesfield/ui/components/slider"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function partsOf(container: HTMLElement) {
  return {
    group: container.querySelector("[data-slot='slider']"),
    thumb: container.querySelector("input[type='range']"),
  }
}

describe("Slider", () => {
  it("names its thumb and leaves the group unnamed", () => {
    const { container } = render(
      <Slider aria-label="Brush size" defaultValue={40} />
    )
    const { group, thumb } = partsOf(container)
    expect(thumb?.getAttribute("aria-label")).toBe("Brush size")
    expect(group?.hasAttribute("aria-label")).toBe(false)
  })

  it("passes a labelling id to the thumb and not to the group", () => {
    const { container } = render(
      <Slider aria-labelledby="size-label" defaultValue={10} />
    )
    const { group, thumb } = partsOf(container)
    expect(thumb?.getAttribute("aria-labelledby")).toBe("size-label")
    expect(group?.getAttribute("aria-labelledby")).not.toBe("size-label")
  })

  it("rings its thumb outside the thumb's edge while the range inside it has keyboard focus", () => {
    const { container } = render(
      <Slider aria-label="Tile size" defaultValue={4} />
    )
    const thumb = container.querySelector("input[type='range']")?.parentElement
    expect(thumb?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "has-[:focus-visible]:outline-(length:--spacing-focus-ring)",
        "has-[:focus-visible]:outline-solid",
        "has-[:focus-visible]:outline-offset-(--spacing-focus-ring)",
        "outline-hor-text",
      ])
    )
  })
})
