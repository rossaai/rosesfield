import { Dialog, DialogContent } from "@rosesfield/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { cleanup, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function Menu(): ReactElement {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger>More</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

async function panel(): Promise<HTMLElement> {
  const item = await screen.findByRole("menuitem", { name: "Delete" })
  const found = item.closest<HTMLElement>("[data-slot='dropdown-menu-content']")
  if (found === null) {
    throw new Error("no menu panel")
  }
  return found
}

describe("a dropdown menu's ground", () => {
  it("steps one tone below the layer it opens from, inside a dialog", async () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close">
          <Menu />
        </DialogContent>
      </Dialog>
    )
    const menu = await panel()
    expect(menu.dataset.depth).toBe("nested")
    expect(menu.className).toContain("dark:[--layer:var(--surface)]")
  })

  it("stands on the layer itself over a page", async () => {
    render(<Menu />)
    const menu = await panel()
    expect(menu.dataset.depth).toBeUndefined()
    expect(menu.className).not.toContain("--layer:")
  })
})
