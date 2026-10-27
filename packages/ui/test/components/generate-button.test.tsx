import { GenerateButton } from "@rosesfield/ui/components/generate-button"
import { GENERATE_BUTTON } from "@rosesfield/ui/contracts/generate-button.generated"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

describe("GenerateButton", () => {
  it("holds its label, the run's price and its glyph, the slots of its contract", () => {
    render(
      <GenerateButton label="Generate" price="6.5" form="tile" icon={<svg />} />
    )
    const button = screen.getByRole("button")
    for (const slot of GENERATE_BUTTON.slots) {
      expect(
        button.querySelector(`[data-slot='generate-button-${slot}']`)
      ).not.toBeNull()
    }
    expect(button.textContent).toBe("Generate6.5")
  })

  it("presses on the press preset and draws no light over its ink", () => {
    render(<GenerateButton label="Generate" price="6.5" form="tile" />)
    const classes = screen.getByRole("button").className.split(" ")
    expect(classes).toContain("motion-press")
    expect(classes.filter((name) => name.includes("after:"))).toEqual([])
  })

  it("stands 120 by 80 as a tile from the regular size and 40 px across its column as a bar, both at the 13 px radius", () => {
    render(
      <>
        <GenerateButton label="Tile" form="tile" />
        <GenerateButton label="Bar" form="bar" />
      </>
    )
    expect(
      screen.getByRole("button", { name: "Tile" }).className.split(" ")
    ).toEqual(
      expect.arrayContaining([
        "@regular:h-20",
        "@regular:w-30",
        "@regular:flex-col",
        "@regular:rounded-cell",
      ])
    )
    expect(
      screen.getByRole("button", { name: "Bar" }).className.split(" ")
    ).toEqual(expect.arrayContaining(["h-field", "w-full", "rounded-cell"]))
  })

  it("is a 33 px pill on a phone, its word then its price on one line, and keeps the price readable", () => {
    render(<GenerateButton label="Generate" price="12.5" form="tile" />)
    const button = screen.getByRole("button", { name: "Generate12.5" })
    expect(button.className.split(" ")).toEqual(
      expect.arrayContaining([
        "h-button-dense",
        "min-w-button-dense",
        "flex-row",
        "rounded-full",
        "px-s3",
      ])
    )
    expect(
      button.querySelector("[data-slot='generate-button-label']")?.className
    ).not.toContain("sr-only")
    expect(
      button.querySelector("[data-slot='generate-button-price']")?.textContent
    ).toBe("12.5")
  })

  it("on a phone shows its glyph alone as a 33 px circle, named by its label, and its label from the regular size", () => {
    render(
      <GenerateButton
        label="Send"
        form="tile"
        icon={<svg data-testid="arrow" />}
      />
    )
    const button = screen.getByRole("button", { name: "Send" })
    expect(button.className.split(" ")).toEqual(
      expect.arrayContaining(["w-button-dense", "px-0", "rounded-full"])
    )
    const glyph = button.querySelector("[data-slot='generate-button-glyph']")
    expect(glyph?.querySelector("[data-testid='arrow']")).not.toBeNull()
    expect(glyph?.getAttribute("aria-hidden")).toBe("true")
    expect(glyph?.className.split(" ")).toContain("@regular:hidden")
    expect(
      button
        .querySelector("[data-slot='generate-button-label']")
        ?.className.split(" ")
    ).toEqual(expect.arrayContaining(["sr-only", "@regular:not-sr-only"]))
  })

  it("draws no glyph as a bar at a column's foot", () => {
    render(<GenerateButton label="Generate" form="bar" icon={<svg />} />)
    const button = screen.getByRole("button", { name: "Generate" })
    expect(
      button.querySelector("[data-slot='generate-button-glyph']")
    ).toBeNull()
  })

  it("shows no price row when the run has no price", () => {
    render(<GenerateButton label="Generate" />)
    const button = screen.getByRole("button", { name: "Generate" })
    expect(button.getAttribute("data-priced")).toBe("no")
    expect(
      button.querySelector("[data-slot='generate-button-price']")
    ).toBeNull()
  })

  it("takes no press while the run starts", () => {
    const press = vi.fn()
    render(<GenerateButton label="Generate" busy onClick={press} />)
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(press).not.toHaveBeenCalled()
  })
})
