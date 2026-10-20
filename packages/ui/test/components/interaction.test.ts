import { interaction } from "@rosesfield/ui/components/interaction"
import { describe, expect, it } from "vitest"
import { readSource } from "../read-source"

function classesOf(name: keyof typeof interaction): string[] {
  return interaction[name].split(" ")
}

describe("interaction", () => {
  it("lights a press exactly as much as a hover", () => {
    const light = classesOf("light")
    const hover = light.filter((name) => name.startsWith("hover:"))
    const press = light.filter(
      (name) => name.startsWith("active:") || name.includes("gallery=press")
    )
    expect(hover).toEqual(["hover:after:opacity-10"])
    expect(press).toEqual([
      "active:after:opacity-10",
      "in-data-[gallery=press]:after:opacity-10",
    ])
  })

  it("never draws a focus ring outside the control's edge", () => {
    const offsets = classesOf("ring").filter((name) =>
      name.includes("outline-offset")
    )
    expect(offsets).toEqual([
      "focus-visible:outline-offset-[calc(var(--spacing-focus-ring)*-1)]",
      "in-data-[gallery=focus]:outline-offset-[calc(var(--spacing-focus-ring)*-1)]",
    ])
  })

  it("draws the base focus ring inside the edge too, for a control without the ring class", () => {
    const globals = readSource("styles/globals.css")
    const rule = /\n {2}:focus-visible \{([^}]*)\}/.exec(globals)?.[1] ?? ""
    expect(rule).toContain("outline: var(--spacing-focus-ring) solid")
    expect(rule).toContain(
      "outline-offset: calc(var(--spacing-focus-ring) * -1);"
    )
  })

  it("removes the reveal's fade under reduced motion", () => {
    expect(classesOf("reveal")).toContain("motion-reduce:transition-none")
  })
})
