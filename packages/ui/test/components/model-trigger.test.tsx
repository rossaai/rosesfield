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
