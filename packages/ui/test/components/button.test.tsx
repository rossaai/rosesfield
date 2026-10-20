import { Button, IconButton } from "@rosesfield/ui/components/button"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

describe("Button", () => {
  it("runs its act when pressed", () => {
    const press = vi.fn()
    render(<Button onClick={press}>Generate</Button>)
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(press).toHaveBeenCalledTimes(1)
  })

  it("keeps its name and takes no press while busy", () => {
    const press = vi.fn()
    render(
      <Button busy onClick={press}>
        Generate
      </Button>
    )
    const button = screen.getByRole("button", { name: "Generate" })
    fireEvent.click(button)
    expect(press).not.toHaveBeenCalled()
    expect(button.getAttribute("aria-busy")).toBe("true")
  })
})

describe("IconButton", () => {
  it("sits in a circle on its ground's well when quiet", () => {
    render(
      <IconButton label="Open the menu" tone="quiet">
        <svg aria-hidden="true" />
      </IconButton>
    )
    const classes = screen
      .getByRole("button", { name: "Open the menu" })
      .className.split(" ")
    expect(classes).toContain("bg-(--well)")
    expect(classes).toContain("rounded-full")
    expect(classes).not.toContain("bg-transparent")
  })
})

function classesOf(name: string): string[] {
  return screen.getByRole("button", { name }).className.split(" ")
}

describe("Button's measures", () => {
  it("stands a hero 48 px tall with 16 px padding, hugging its one-line label", () => {
    render(<Button size="hero">Start</Button>)
    const classes = classesOf("Start")
    expect(classes).toEqual(
      expect.arrayContaining(["h-12", "p-4", "whitespace-nowrap"])
    )
    expect(classes.some((name) => name.startsWith("max-w-"))).toBe(false)
  })

  it("stands Recreate 32 px tall and 28 px when small, its 16 px glyph against a label with 6 px of its own padding", () => {
    render(
      <>
        <Button size="recreate">
          <svg aria-hidden="true" />
          Recreate
        </Button>
        <Button size="recreateSmall">
          <svg aria-hidden="true" />
          Copy
        </Button>
      </>
    )
    const pad = "[&_[data-slot=button-label]]:px-1.5"
    expect(classesOf("Recreate")).toEqual(
      expect.arrayContaining(["h-8", "px-3", "gap-0", "[&_svg]:size-4", pad])
    )
    expect(classesOf("Copy")).toEqual(
      expect.arrayContaining(["h-7", "px-2", "gap-0", "[&_svg]:size-4", pad])
    )
    const label = screen
      .getByRole("button", { name: "Recreate" })
      .querySelector("[data-slot='button-label']")
    expect(label?.textContent).toBe("Recreate")
    expect(label?.previousElementSibling?.tagName.toLowerCase()).toBe("svg")
  })

  it("draws the same light on press as on hover and never changes its size", () => {
    render(<Button tone="primary">Generate</Button>)
    const classes = classesOf("Generate")
    expect(classes).toContain("hover:after:opacity-10")
    expect(classes).toContain("active:after:opacity-10")
    expect(classes).toContain("in-data-[gallery=press]:after:opacity-10")
    expect(classes.filter((name) => name.includes("opacity-15"))).toEqual([])
    expect(classes.filter((name) => /scale|motion-press/.test(name))).toEqual(
      []
    )
  })

  it("draws its focus ring inside its own edge, so no overflow clips it", () => {
    render(
      <IconButton label="Close" place="close">
        <svg aria-hidden="true" />
      </IconButton>
    )
    expect(classesOf("Close")).toEqual(
      expect.arrayContaining([
        "focus-visible:outline-offset-[calc(var(--spacing-focus-ring)*-1)]",
        "in-data-[gallery=focus]:outline-offset-[calc(var(--spacing-focus-ring)*-1)]",
      ])
    )
  })
})

describe("IconButton's roles", () => {
  it.each([
    ["barCompact", "size-6"],
    ["bar", "size-9"],
    ["close", "size-9.5"],
    ["card", "size-7"],
    ["cardWide", "size-8"],
    ["clip", "size-10"],
    ["carousel", "size-15"],
  ] as const)("sizes the %s glyph button with %s", (place, size) => {
    render(
      <IconButton label="Close" place={place}>
        <svg aria-hidden="true" />
      </IconButton>
    )
    const button = screen.getByRole("button", { name: "Close" })
    expect(button.className.split(" ")).toContain(size)
    expect(button.textContent).toBe("")
  })
})
