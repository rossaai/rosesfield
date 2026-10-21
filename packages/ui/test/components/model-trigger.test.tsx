import {
  ModelChip,
  ModelRowTrigger,
} from "@rosesfield/ui/components/model-trigger"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("ModelChip", () => {
  it("is the lab's mark, the name and a chevron pointing right, 32 px tall with 12 px sides", () => {
    render(<ModelChip name="Picture 2" mark={<svg data-testid="mark" />} />)
    const chip = screen.getByRole("button", { name: "Picture 2" })
    expect(chip.className.split(" ")).toEqual(
      expect.arrayContaining(["h-8", "px-3"])
    )
    const parts = [...chip.children].map((child) =>
      child.getAttribute("data-slot")
    )
    expect(parts.slice(0, 2)).toEqual(["model-row-mark", "model-row-name"])
    expect(chip.lastElementChild?.getAttribute("class")).toContain(
      "lucide-chevron-right"
    )
  })
})

describe("ModelChip width", () => {
  it("hugs its name with no edge: the mark 12 px in, the name's text 8 px after the mark, 2 px before the chevron, so the chip is the name plus 66 px", () => {
    render(<ModelChip name="Picture 2" mark={<svg data-testid="mark" />} />)
    const chip = screen.getByRole("button", { name: "Picture 2" })
    const classes = chip.className.split(" ")
    expect(classes).toContain("px-3")
    expect(classes).not.toContain("border")
    expect(classes.some((one) => one.startsWith("border-"))).toBe(false)
    const name = chip.querySelector("[data-slot='model-row-name']")
    const nameClasses = name?.className.split(" ") ?? []
    expect(nameClasses).toEqual(expect.arrayContaining(["ms-2", "pe-0.5"]))
    expect(nameClasses.some((one) => /^(px|ps|pl)-/.test(one))).toBe(false)
    const chevron = chip.lastElementChild?.getAttribute("class") ?? ""
    expect(chevron).not.toMatch(/\bms-/)
  })
})

describe("ModelRowTrigger", () => {
  it("is a 48 px row with its caption over the name", () => {
    render(<ModelRowTrigger caption="Model" name="Clip 3" />)
    const row = screen.getByRole("button", { name: /Clip 3/ })
    expect(row.className.split(" ")).toEqual(
      expect.arrayContaining(["h-12", "w-full"])
    )
    expect(row.textContent).toBe("ModelClip 3")
  })
})

describe("ModelRowTrigger order", () => {
  it("puts the name first, the lab's mark after it, then the chevron at the edge", () => {
    render(
      <ModelRowTrigger
        caption="Model"
        name="Clip 3"
        mark={<svg data-testid="mark" />}
      />
    )
    const row = screen.getByRole("button", { name: /Clip 3/ })
    const order = [
      ...row.querySelectorAll(
        "[data-slot='model-row-mark'], [data-slot='model-row-name'], .lucide-chevron-right"
      ),
    ].map(
      (part) =>
        part.getAttribute("data-slot") ?? String(part.getAttribute("class"))
    )
    expect(order[0]).toBe("model-row-name")
    expect(order[1]).toBe("model-row-mark")
    expect(order[2]).toContain("lucide-chevron-right")
  })
})
