import {
  Skeleton,
  SkeletonCard,
  SkeletonGroup,
  SkeletonMasonry,
  SkeletonRow,
} from "@rosesfield/ui/components/skeleton"
import { SKELETON } from "@rosesfield/ui/contracts/skeleton.generated"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function classesOf(element: Element | null): string[] {
  return element?.className.split(" ") ?? []
}

function shapes(): Element[] {
  return [...document.querySelectorAll("[data-slot='skeleton']")]
}

describe("Skeleton", () => {
  it("draws a line as the bar of its text's line less 3 px above and below, at its measure", () => {
    render(<Skeleton shape="line" text="title" measure="short" />)
    const [line] = shapes()
    expect(line?.getAttribute("data-shape")).toBe("line")
    expect(classesOf(line ?? null)).toEqual(
      expect.arrayContaining([
        "my-s1",
        "rounded-full",
        "h-[calc(var(--text-title--line-height)-2*var(--spacing-s1))]",
        "w-[40%]",
      ])
    )
  })

  it("takes every text and measure the contract names, each a size of its own", () => {
    const { text, measure } = SKELETON.variants
    render(
      text.values.map((value) => (
        <Skeleton key={value} shape="line" text={value} />
      ))
    )
    const heights = shapes().map((shape) =>
      classesOf(shape).find((name) => name.startsWith("h-"))
    )
    expect(new Set(heights).size).toBe(text.values.length)
    cleanup()
    render(
      measure.values.map((value) => (
        <Skeleton key={value} shape="line" measure={value} />
      ))
    )
    const widths = shapes().map((shape) =>
      classesOf(shape).find((name) => name.startsWith("w-"))
    )
    expect(new Set(widths).size).toBe(measure.values.length)
  })

  it("draws a circle and a chip at the control sizes, as capsules", () => {
    render(
      <>
        <Skeleton shape="circle" size="touch" />
        <Skeleton shape="chip" size="switch" />
      </>
    )
    const [circle, chip] = shapes()
    expect(classesOf(circle ?? null)).toEqual(
      expect.arrayContaining(["size-icon", "rounded-full", "shrink-0"])
    )
    expect(classesOf(chip ?? null)).toEqual(
      expect.arrayContaining(["h-switch-height", "w-switch-width"])
    )
  })

  it("draws a frame that fills its stage at the media corner, square when flush", () => {
    render(
      <>
        <Skeleton shape="frame" />
        <Skeleton shape="frame" corner="flush" />
      </>
    )
    const [tile, flush] = shapes()
    expect(classesOf(tile ?? null)).toEqual(
      expect.arrayContaining(["flex-1", "self-stretch", "rounded-cell"])
    )
    expect(classesOf(flush ?? null)).toContain("rounded-none")
  })

  it("stands one ground step off its region by default, and off the ground it names", () => {
    render(
      <>
        <Skeleton shape="line" />
        <Skeleton shape="line" ground="surface" />
        <Skeleton shape="line" ground="layerWell" />
      </>
    )
    const [region, surface, layerWell] = shapes()
    expect(classesOf(region ?? null)).toContain("bg-(--tint)")
    expect(classesOf(surface ?? null)).toContain("bg-surface-2")
    expect(classesOf(surface ?? null)).not.toContain("bg-(--tint)")
    expect(classesOf(layerWell ?? null)).toContain("bg-layer")
  })

  it("keeps the block a screen sizes, for the shapes it draws itself", () => {
    render(<Skeleton className="h-s12 w-full" />)
    const [block] = shapes()
    expect(block?.getAttribute("data-shape")).toBe("block")
    expect(classesOf(block ?? null)).toEqual(
      expect.arrayContaining(["rounded-cell", "h-s12", "w-full"])
    )
  })

  it("breathes on its own alone, and on its group's one pulse inside a group", () => {
    render(
      <>
        <Skeleton shape="line" />
        <SkeletonGroup>
          <Skeleton shape="line" />
          <Skeleton shape="circle" />
        </SkeletonGroup>
      </>
    )
    const [alone, first, second] = shapes()
    expect(classesOf(alone ?? null)).toContain("motion-pulse")
    expect(classesOf(first ?? null)).not.toContain("motion-pulse")
    expect(classesOf(second ?? null)).not.toContain("motion-pulse")
    const group = document.querySelector("[data-slot='skeleton-group']")
    expect(classesOf(group)).toContain("motion-pulse")
    expect(group?.getAttribute("aria-busy")).toBe("true")
  })
})

describe("Skeleton's composed shapes", () => {
  it("draws a masonry of the columns asked, its tiles at 3:4, 1:1 and 9:16", () => {
    const { container } = render(<SkeletonMasonry columns={6} />)
    const stacks = container.querySelectorAll("[data-slot='skeleton-stack']")
    expect(stacks).toHaveLength(6)
    const ratios = new Set(
      [...container.querySelectorAll("[data-ratio]")].map((tile) =>
        tile.getAttribute("data-ratio")
      )
    )
    expect([...ratios].sort()).toEqual([
      "aspect-3/4",
      "aspect-9/16",
      "aspect-square",
    ])
    const grid = container.firstElementChild
    expect(
      grid instanceof HTMLElement ? grid.style.gridTemplateColumns : ""
    ).toBe("repeat(6, minmax(0, 1fr))")
  })

  it("draws a list row as a thumb and one body line at full width", () => {
    const { container } = render(<SkeletonRow />)
    const parts = [...container.querySelectorAll("[data-slot='skeleton']")]
    expect(parts).toHaveLength(2)
    expect(classesOf(parts[0] ?? null)).toContain("size-thumb")
    expect(parts[1]?.getAttribute("data-shape")).toBe("line")
    expect(classesOf(parts[1] ?? null)).toContain("w-full")
  })

  it("draws a card at the size it is given", () => {
    const { container } = render(
      <SkeletonCard aspect={{ width: 16, height: 9 }} />
    )
    const card = container.querySelector<HTMLElement>("[data-shape='card']")
    expect(card?.style.aspectRatio).toBe("16 / 9")
  })
})
