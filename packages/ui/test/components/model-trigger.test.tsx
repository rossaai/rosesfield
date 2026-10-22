import {
  ModelChip,
  ModelChipSkeleton,
  ModelRowTrigger,
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

describe("ModelRowTrigger", () => {
  it("is one 36 px row: the label at the start and the 26 px trigger as its value", () => {
    render(<ModelRowTrigger caption="Model" name="Clip 3" mark={<svg />} />)
    const trigger = screen.getByRole("button", { name: /Clip 3/ })
    const row = trigger.parentElement
    expect(row?.getAttribute("data-slot")).toBe("model-row-field")
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining(["h-button", "justify-between"])
    )
    expect(row?.firstElementChild?.textContent).toBe("Model")
    expect(trigger.className.split(" ")).toContain("h-button-small")
    expect(trigger.textContent).toBe("Clip 3")
  })
})
