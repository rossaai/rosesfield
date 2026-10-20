import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("TooltipContent", () => {
  it("is one 24 px line that sits 9 px above its trigger", async () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>References</TooltipTrigger>
          <TooltipContent>References</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    const tip = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot='tooltip-content']"
      )
      if (found === null) {
        throw new Error("no tooltip")
      }
      return found
    })
    expect(tip.className.split(" ")).toEqual(
      expect.arrayContaining(["h-6", "whitespace-nowrap"])
    )
    expect(tip.className).not.toMatch(/\bpy-/)
    const positioner = tip.parentElement
    expect(positioner?.getAttribute("style")).toContain("-9px")
    expect(screen.getAllByText("References")).toHaveLength(2)
  })
})
