import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { AppForm } from "@/screens/app/use-app-form"
import { SoundChip } from "@/studio/video/video-chips"

afterEach(cleanup)

const form: AppForm = {
  values: { inputs: {}, seedMode: "random", count: 1, aspectRatio: null },
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
}

describe("the prompt's chip row", () => {
  it("holds Sound as a 26 px chip", () => {
    render(
      <TooltipProvider>
        <SoundChip form={form} fields={null} isGraph makesSound={false} />
      </TooltipProvider>
    )
    const chip = screen.getByRole("button", { pressed: true })
    expect(chip.className.split(" ")).toContain("h-6.5")
  })
})
