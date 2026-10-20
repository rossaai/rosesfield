import { findApp } from "@rosesfield/catalog"
import { type AppListing, appListing } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { countField, type FormValues } from "@/screens/app/app-form"
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
    expect(stepper.className).toContain("w-24.5")
    expect(stepper.className).toContain("h-8")
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
          unit=""
          onChange={() => undefined}
        />
        <StepperChip
          label="Length"
          shown="5 s"
          value={5}
          min={4}
          max={30}
          step={1}
          unit="s"
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
