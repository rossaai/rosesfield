import { GenerateButton } from "@rosesfield/ui/components/generate-button"
import { GENERATE_BUTTON } from "@rosesfield/ui/contracts/generate-button.generated"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

describe("GenerateButton", () => {
  it("holds its label and the run's price, the two slots of its contract", () => {
    render(<GenerateButton label="Generate" price="6.5" form="tile" />)
    const button = screen.getByRole("button")
    for (const slot of GENERATE_BUTTON.slots) {
      expect(
        button.querySelector(`[data-slot='generate-button-${slot}']`)
      ).not.toBeNull()
    }
    expect(button.textContent).toBe("Generate6.5")
  })

  it("lights a press one step more than a hover and moves nothing", () => {
    render(<GenerateButton label="Generate" price="6.5" form="tile" />)
    const classes = screen.getByRole("button").className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining([
        "hover:after:opacity-10",
        "active:after:opacity-20",
        "in-data-[gallery=press]:after:opacity-20",
      ])
    )
    expect(classes).not.toContain("active:after:opacity-10")
    expect(classes.filter((name) => /scale|translate/.test(name))).toEqual([])
  })

  it("stands 120 by 80 as a tile and 48 px across its column as a bar", () => {
    render(
      <>
        <GenerateButton label="Tile" form="tile" />
        <GenerateButton label="Bar" form="bar" />
      </>
    )
    expect(
      screen.getByRole("button", { name: "Tile" }).className.split(" ")
    ).toEqual(expect.arrayContaining(["h-20", "w-30", "flex-col"]))
    expect(
      screen.getByRole("button", { name: "Bar" }).className.split(" ")
    ).toEqual(expect.arrayContaining(["h-12", "w-full", "gap-2"]))
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
