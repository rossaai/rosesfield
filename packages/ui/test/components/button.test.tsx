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

  it("stands Recreate 32 px tall with its 16 px glyph 6 px before the label, and 28 px when small", () => {
    render(
      <>
        <Button size="recreate">Recreate</Button>
        <Button size="recreateSmall">Copy</Button>
      </>
    )
    expect(classesOf("Recreate")).toEqual(
      expect.arrayContaining(["h-8", "gap-1.5", "[&_svg]:size-4"])
    )
    expect(classesOf("Copy")).toEqual(
      expect.arrayContaining(["h-7", "gap-1.5", "[&_svg]:size-4"])
    )
  })

  it("changes light on hover and press and never its size", () => {
    render(<Button tone="primary">Generate</Button>)
    const classes = classesOf("Generate")
    expect(classes).toContain("hover:after:opacity-10")
    expect(classes).toContain("active:after:opacity-15")
    expect(classes.filter((name) => /scale|motion-press/.test(name))).toEqual(
      []
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
