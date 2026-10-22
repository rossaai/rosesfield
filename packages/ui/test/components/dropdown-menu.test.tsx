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
  it("stands opaque inside a dialog in both schemes: the canvas in light, one tone below the layer in dark", async () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close">
          <Menu />
        </DialogContent>
      </Dialog>
    )
    const menu = await panel()
    expect(menu.dataset.depth).toBe("nested")
    const classes = menu.className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining([
        "[--layer:var(--canvas)]",
        "dark:[--layer:var(--surface)]",
        "bg-(--layer)!",
        "backdrop-filter-none!",
        "shadow-float",
      ])
    )
  })

  it("stands on the layer itself over a page", async () => {
    render(<Menu />)
    const menu = await panel()
    expect(menu.dataset.depth).toBeUndefined()
    expect(menu.className).not.toContain("--layer:")
  })
})

describe("a dropdown menu's lead seat", () => {
  it("seats every item's words on one column when any item has a lead", async () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem lead={<svg />}>Rename</DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    const plain = await screen.findByRole("menuitem", { name: "Delete" })
    const led = screen.getByRole("menuitem", { name: "Rename" })
    const menu = plain.closest<HTMLElement>(
      "[data-slot='dropdown-menu-content']"
    )
    expect(led.querySelector("[data-slot='dropdown-menu-lead']")).not.toBeNull()
    expect(plain.querySelector("[data-slot='dropdown-menu-lead']")).toBeNull()
    expect(menu?.className).toContain(
      "has-[[data-slot=dropdown-menu-lead]]:[--menu-lead:calc(var(--spacing-glyph)+var(--spacing-s3))]"
    )
    expect(plain.className).toContain(
      "ps-[calc(var(--spacing-s4)+var(--menu-lead,0px))]"
    )
    expect(led.className).toContain(
      "has-[>[data-slot=dropdown-menu-lead]]:ps-s4"
    )
  })
})
