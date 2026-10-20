import {
  FilterChip,
  FilterChipRow,
  SettingGroup,
} from "@rosesfield/ui/components/filter-chip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("FilterChip", () => {
  it("is a 32 px link to its preset with 10 px sides and a 4 px label frame", () => {
    render(
      <FilterChipRow label="Presets">
        <FilterChip href="/apps/effects?preset=melt">Melt</FilterChip>
      </FilterChipRow>
    )
    const chip = screen.getByRole("link", { name: "Melt" })
    expect(chip.getAttribute("href")).toBe("/apps/effects?preset=melt")
    expect(chip.className.split(" ")).toEqual(
      expect.arrayContaining(["h-8", "px-2.5", "border"])
    )
    expect(chip.firstElementChild?.className).toBe("px-1")
  })

  it("wraps centred 8 px apart on a desktop and scrolls one 48 px line on a phone", () => {
    render(
      <FilterChipRow label="Presets">
        <FilterChip href="/a">A</FilterChip>
      </FilterChipRow>
    )
    const line = screen.getByRole("navigation", { name: "Presets" })
      .firstElementChild
    expect(line?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "h-12",
        "gap-2",
        "flex-nowrap",
        "overflow-x-auto",
        "@regular:flex-wrap",
        "@regular:justify-center",
      ])
    )
  })
})

describe("SettingGroup", () => {
  it("shows its count while closed and opens its choices on a press", () => {
    render(
      <SettingGroup name="Camera" count={12} icon={<svg />}>
        <button type="button">Dolly</button>
      </SettingGroup>
    )
    const trigger = screen.getByRole("button", { name: /Camera/ })
    expect(trigger.textContent).toContain("· 12")
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    fireEvent.click(trigger)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByRole("button", { name: "Dolly" })).toBeTruthy()
  })

  it("clips its card and moves its panel's height on the chevron's timing", () => {
    const { container } = render(
      <SettingGroup name="Camera" count={12} icon={<svg />} defaultOpen>
        <button type="button">Dolly</button>
      </SettingGroup>
    )
    const card = container.querySelector('[data-slot="setting-group"]')
    const panel = container.querySelector('[data-slot="setting-group-panel"]')
    expect(card?.className.split(" ")).toContain("overflow-hidden")
    expect(panel?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "h-(--collapsible-panel-height)",
        "overflow-hidden",
        "[transition:height_var(--control-change)]",
        "data-starting-style:h-0",
        "data-ending-style:h-0",
      ])
    )
    expect(
      panel?.querySelector('[data-slot="setting-group-choices"]')?.className
    ).toContain("grid-cols-3")
  })
})
