import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("ChipSelect", () => {
  it("names its combobox by its label, so a reader and a test find the setting it sets", () => {
    render(
      <TooltipProvider>
        <ChipSelect
          label="Format"
          icon={<svg data-testid="format-icon" />}
          value="1:1"
          onValueChange={() => undefined}
          options={[
            { value: "1:1", label: "1:1" },
            { value: "16:9", label: "16:9" },
          ]}
        />
      </TooltipProvider>
    )
    expect(screen.getByRole("combobox", { name: "Format" })).toBeDefined()
  })
})
