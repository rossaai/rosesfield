import { findApp } from "@rosesfield/catalog"
import { type AppListing, appListing } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import {
  aspectField,
  countField,
  type FormValues,
} from "@/screens/app/app-form"
import { SettingChip, StepperChip } from "@/screens/app/bar/setting-chip"
import type { AppForm } from "@/screens/app/use-app-form"

afterEach(cleanup)

const image = appListing.parse(findApp("image"))
const app: AppListing = {
  ...image,
  output: { ...image.output, count: { ...image.output.count, max: 4 } },
}

function formAt(count: number, changes: Partial<FormValues>[]): AppForm {
  return {
    values: { inputs: {}, seedMode: "random", count, aspectRatio: null },
    problems: new Map(),
    setInput: () => undefined,
    setForm: (change) => changes.push(change),
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
}

function renderCount(count: number): Partial<FormValues>[] {
  const changes: Partial<FormValues>[] = []
  render(
    <TooltipProvider>
      <SettingChip app={app} form={formAt(count, changes)} name={countField} />
    </TooltipProvider>
  )
  return changes
}

describe("the count stepper at the end of the chip row", () => {
  it("shows the count over its maximum between a minus and a plus", () => {
    const changes = renderCount(1)
    const stepper = screen.getByRole("group", { name: t("field.count.label") })
    expect(stepper.textContent).toBe("1/4")
    expect(stepper.className).toContain("h-button-small")
    expect(stepper.className).toContain("rounded-full")
    fireEvent.click(screen.getByRole("button", { name: t("bar.count.more") }))
    expect(changes).toEqual([{ count: 2 }])
  })

  it("disables the minus at 1 and the plus at the maximum", () => {
    renderCount(1)
    expect(
      screen.getByRole("button", { name: t("bar.count.less") })
    ).toHaveProperty("disabled", true)
    cleanup()
    renderCount(4)
    expect(
      screen.getByRole("button", { name: t("bar.count.more") })
    ).toHaveProperty("disabled", true)
  })

  it("draws a count stepper chip as the stepper, and any other number as a chip", () => {
    render(
      <TooltipProvider>
        <StepperChip
          label={t("field.count.label")}
          shown=""
          value={2}
          min={1}
          max={4}
          step={1}
          onChange={() => undefined}
        />
        <StepperChip
          label="Length"
          shown="5 s"
          value={5}
          min={4}
          max={30}
          step={1}
          onChange={() => undefined}
        />
      </TooltipProvider>
    )
    expect(
      screen.getByRole("group", { name: t("field.count.label") }).textContent
    ).toBe("2/4")
    expect(screen.queryByRole("group", { name: "Length" })).toBeNull()
    expect(screen.getByRole("button", { name: /Length/ })).toBeDefined()
  })
})

describe("a number chip's popover", () => {
  it("opens a 334 px stepper above its tile, 8 px clear and with no open motion, the control the column draws for the same number", async () => {
    const values: number[] = []
    render(
      <TooltipProvider>
        <StepperChip
          label="Length"
          shown="5 s"
          value={5}
          min={4}
          max={30}
          step={1}
          unit="s"
          onChange={(value) => values.push(value)}
        />
      </TooltipProvider>
    )
    fireEvent.click(screen.getByRole("button", { name: /Length/ }))
    const popover = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot='popover-content']"
      )
      if (found === null) {
        throw new Error("no popover")
      }
      return found
    })
    const classes = popover.className.split(" ")
    expect(classes).toEqual(expect.arrayContaining(["w-83.5", "px-4.25"]))
    expect(classes).not.toContain("motion-popover")
    expect(popover.parentElement?.getAttribute("style")).toContain("-8px")
    expect(popover.querySelector("input[type='range']")).toBeNull()
    const stepper = screen.getByRole("group", { name: "Length" })
    expect(stepper.querySelector("output")?.textContent).toBe("5s")
    fireEvent.click(
      screen.getByRole("button", { name: t("field.number.increase") })
    )
    expect(values).toEqual([6])
  })
})

describe("the aspect chip's menu", () => {
  it("is 200 px wide with a 32 px header naming the setting, a shape beside each ratio, and the chosen ratio's shape on the chip", async () => {
    render(
      <TooltipProvider>
        <SettingChip app={app} form={formAt(1, [])} name={aspectField} />
      </TooltipProvider>
    )
    const chip = screen.getByRole("combobox")
    const lead = chip.querySelector("[data-slot='select-lead'] svg")
    expect(lead?.getAttribute("data-ratio")).not.toBeNull()
    fireEvent.click(chip)
    const menu = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot='select-content']"
      )
      if (found === null) {
        throw new Error("no menu")
      }
      return found
    })
    expect(menu.className.split(" ")).toEqual(
      expect.arrayContaining(["w-50", "p-2"])
    )
    const header = menu.querySelector("[data-slot='select-label']")
    expect(header?.textContent).toBe(t("field.aspect.label"))
    expect(header?.className.split(" ")).toContain("h-8")
    const options = [...menu.querySelectorAll("[data-slot='select-item']")]
    expect(options.length).toBeGreaterThan(1)
    for (const option of options) {
      expect(option.className.split(" ")).toContain("min-h-9")
      expect(
        option.querySelector("[data-slot='select-item-icon'] svg")
      ).not.toBeNull()
    }
    const chosen = options.find((option) =>
      option.hasAttribute("data-selected")
    )
    expect(
      chosen
        ?.querySelector("[data-slot='select-item-icon'] svg")
        ?.getAttribute("data-ratio")
    ).toBe(lead?.getAttribute("data-ratio"))
  })
})

describe("a choice chip of a setting with no role", () => {
  it("carries the icon its setting's name gives, so Relight's three Auto chips read apart", () => {
    const relight = appListing.parse(findApp("relight"))
    render(
      <TooltipProvider>
        {["direction", "softness", "color"].map((name) => (
          <SettingChip
            key={name}
            app={relight}
            form={formAt(1, [])}
            name={name}
          />
        ))}
      </TooltipProvider>
    )
    const icons = screen
      .getAllByRole("combobox")
      .map((chip) => chip.querySelector("svg")?.getAttribute("class"))
    expect(icons.every((icon) => icon !== undefined)).toBe(true)
    expect(new Set(icons).size).toBe(3)
  })
})
