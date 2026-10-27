import {
  ModelChip,
  ModelChipSkeleton,
} from "@rosesfield/ui/components/model-trigger"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("ModelChip", () => {
  it("is the lab's mark, the name and a chevron, a 26 px capsule on its ground's well", () => {
    render(<ModelChip name="Picture 2" mark={<svg data-testid="mark" />} />)
    const chip = screen.getByRole("button", { name: "Picture 2" })
    expect(chip.className.split(" ")).toEqual(
      expect.arrayContaining([
        "h-button-small",
        "rounded-full",
        "bg-(--well)",
        "max-w-button-max",
        "in-data-[density=composer]:bg-transparent",
        "hover:bg-(--tint)",
        "motion-press",
      ])
    )
    const parts = [...chip.children].map((child) =>
      child.getAttribute("data-slot")
    )
    expect(parts.slice(0, 2)).toEqual(["model-row-mark", "model-row-name"])
    const chevron = chip.lastElementChild?.getAttribute("class") ?? ""
    expect(chevron).toContain("lucide-chevron-down")
    expect(chevron).toContain("motion-disclosure")
  })

  it("truncates only its name, so the mark and the chevron keep their size", () => {
    render(<ModelChip name="A very long model name" mark={<svg />} />)
    const chip = screen.getByRole("button", { name: "A very long model name" })
    expect(
      chip.querySelector("[data-slot='model-row-name']")?.className.split(" ")
    ).toEqual(expect.arrayContaining(["min-w-0", "truncate"]))
    expect(
      chip.querySelector("[data-slot='model-row-mark']")?.className.split(" ")
    ).toContain("shrink-0")
  })

  it("drops its width cap and keeps its size in a composer's chip row, which scrolls, so its name shows whole", () => {
    render(<ModelChip name="A very long model name" mark={<svg />} />)
    const chip = screen.getByRole("button", { name: "A very long model name" })
    expect(chip.className.split(" ")).toEqual(
      expect.arrayContaining([
        "in-data-[density=composer]:max-w-none",
        "in-data-[density=composer]:shrink-0",
      ])
    )
  })

  it("keeps its whole name in a composer's chip row at every size, never shrinking", () => {
    render(<ModelChip name="A very long model name" mark={<svg />} />)
    const chip = screen.getByRole("button", { name: "A very long model name" })
    expect(chip.className.split(" ")).toContain(
      "in-data-[density=composer]:shrink-0"
    )
    expect(chip.className).not.toContain("@max-regular:")
  })
})

describe("ModelChip at full width", () => {
  it("fills its column at the field height, the name taking the room before the chevron", () => {
    render(<ModelChip name="Picture 2" width="full" mark={<svg />} />)
    const chip = screen.getByRole("button", { name: "Picture 2" })
    const classes = chip.className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining([
        "w-full",
        "h-field",
        "max-w-none",
        "rounded-full",
      ])
    )
    expect(classes).not.toContain("max-w-button-max")
    expect(classes).not.toContain("h-button-small")
    expect(
      chip.querySelector("[data-slot='model-row-name']")?.className.split(" ")
    ).toContain("flex-1")
  })
})

describe("ModelChipSkeleton", () => {
  it("shows a mark circle and a name line and no words while the model loads", () => {
    const { container } = render(<ModelChipSkeleton />)
    const group = container.firstElementChild
    expect(group?.textContent).toBe("")
    expect(group?.className.split(" ")).toEqual(
      expect.arrayContaining(["h-button-small", "rounded-full"])
    )
    const shapes = [
      ...container.querySelectorAll("[data-slot='skeleton']"),
    ].map((one) => one.getAttribute("data-shape"))
    expect(shapes).toEqual(["circle", "line"])
  })
})
