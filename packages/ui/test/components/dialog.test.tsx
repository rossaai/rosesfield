import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@rosesfield/ui/components/dialog"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { readSource } from "../read-source"

afterEach(cleanup)

describe("Dialog", () => {
  it("sets its title at the body size in Medium, with a 36 px close circle on the title line", () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close">
          <DialogTitle>Connect</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(
      screen.getByRole("heading", { name: "Connect" }).className.split(" ")
    ).toEqual(expect.arrayContaining(["text-body", "font-medium"]))
    const close = screen.getByRole("button", { name: "Close" })
    expect(close.className.split(" ")).toEqual(
      expect.arrayContaining(["size-icon", "top-s1_5", "right-s1_5"])
    )
  })

  it("dims the page behind the thin material, with the dim alone where transparency is reduced", () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close">
          <DialogTitle>Connect</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    const scrim = document.querySelector("[data-slot='dialog-scrim']")
    expect(scrim?.className.split(" ")).toEqual(
      expect.arrayContaining(["material-scrim", "motion-scrim"])
    )
    const globals = readSource("styles/globals.css")
    const utility = globals.slice(globals.indexOf("@utility material-scrim"))
    expect(utility).toContain("background-color: var(--scrim);")
    expect(utility).toContain("backdrop-filter: var(--material-filter-thin);")
    expect(utility).toContain("prefers-reduced-transparency: reduce")
  })

  it("rises from below on the layer preset unless its origin names a closed look", () => {
    const motion = readSource("styles/motion.css")
    const layer = motion.slice(motion.indexOf("@utility motion-layer"))
    expect(layer).toContain(
      "transform: var(--layer-origin, translateY(var(--spacing-rise)));"
    )
  })
})
