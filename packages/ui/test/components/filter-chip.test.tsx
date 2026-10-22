import {
  FilterChip,
  FilterChipRow,
  SettingChoice,
  SettingGroup,
} from "@rosesfield/ui/components/filter-chip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

describe("FilterChip", () => {
  it("is a 33 px capsule link to its preset with 10 px sides that presses on the press preset", () => {
    render(
      <FilterChipRow label="Presets">
        <FilterChip href="/apps/effects?preset=melt">Melt</FilterChip>
      </FilterChipRow>
    )
    const chip = screen.getByRole("link", { name: "Melt" })
    expect(chip.getAttribute("href")).toBe("/apps/effects?preset=melt")
    expect(chip.className.split(" ")).toEqual(
      expect.arrayContaining([
        "h-button-dense",
        "px-s3",
        "rounded-full",
        "motion-press",
      ])
    )
    expect(chip.firstElementChild?.className).toBe("px-1")
  })

  it("wraps centred 8 px apart on a desktop and scrolls one 48 px line on a phone", () => {
    render(
      <FilterChipRow label="Presets">
        <FilterChip href="/a">A</FilterChip>
      </FilterChipRow>
    )
    const line = screen.getByRole("navigation", {
      name: "Presets",
    }).firstElementChild
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

describe("FilterChip's tag", () => {
  it("rides 4 px after the name, raised to 4 px under the chip's top", () => {
    render(
      <FilterChip href="/a" tag="New">
        Orbit
      </FilterChip>
    )
    const tag = screen
      .getByRole("link", { name: /Orbit/ })
      .querySelector("[data-slot='inline-chip-tag']")
    expect(tag?.textContent).toBe("New")
    expect(tag?.previousElementSibling?.className).toBe("px-1")
    expect(tag?.className.split(" ")).toEqual(
      expect.arrayContaining(["self-start", "pt-0.75", "text-legal"])
    )
  })
})

describe("SettingChoice", () => {
  it("is an 88 by 104 picture card with a 68 px picture 12 px from its top and its name on a 20 px foot", () => {
    const choose = vi.fn()
    render(
      <div data-slot="setting-group-choices">
        <SettingChoice
          label="Images"
          picture={<svg data-testid="picture" />}
          isCurrent={false}
          onChoose={choose}
        />
      </div>
    )
    const card = screen.getByRole("button", { name: "Images" })
    expect(card.getAttribute("aria-pressed")).toBe("false")
    expect(card.className.split(" ")).toEqual(
      expect.arrayContaining(["h-26", "p-1", "items-end", "overflow-hidden"])
    )
    const picture = card.querySelector("[data-slot='setting-choice-picture']")
    expect(picture?.className.split(" ")).toEqual(
      expect.arrayContaining(["size-17", "top-3", "left-1/2"])
    )
    expect(picture?.contains(screen.getByTestId("picture"))).toBe(true)
    expect(
      card.querySelector("[data-slot='setting-choice-label']")?.className
    ).toContain("h-5")
    fireEvent.click(card)
    expect(choose).toHaveBeenCalledTimes(1)
  })

  it("marks the current card with the accent ring and takes no light on hover", () => {
    render(
      <SettingChoice
        label="All"
        picture={<svg />}
        isCurrent
        onChoose={() => undefined}
      />
    )
    const card = screen.getByRole("button", { name: "All" })
    expect(card.getAttribute("aria-pressed")).toBe("true")
    const classes = card.className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining([
        "aria-pressed:inset-ring-4",
        "aria-pressed:inset-ring-ink",
      ])
    )
    expect(
      classes.filter((name) => /hover|after:|gallery=press/.test(name))
    ).toEqual([])
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

  it("clips its card, yields its panel's height and turns its chevron on the disclosure preset", () => {
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
        "motion-yield",
        "data-starting-style:h-0",
        "data-ending-style:h-0",
      ])
    )
    expect(
      panel
        ?.querySelector('[data-slot="setting-group-choices"]')
        ?.className.split(" ")
    ).toContain("grid-cols-[repeat(3,--spacing(22))]")
    const chevron = [
      ...container.querySelectorAll('[data-slot="setting-group-trigger"] svg'),
    ].at(-1)
    expect(chevron?.getAttribute("class")?.split(" ")).toEqual(
      expect.arrayContaining([
        "motion-disclosure",
        "group-data-panel-open/trigger:-rotate-180",
      ])
    )
  })
})
