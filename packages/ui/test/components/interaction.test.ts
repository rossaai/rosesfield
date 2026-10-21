import { interaction } from "@rosesfield/ui/components/interaction"
import { describe, expect, it } from "vitest"
import { readSource } from "../read-source"

function classesOf(name: keyof typeof interaction): string[] {
  return interaction[name].split(" ")
}

function pressOf(classes: readonly string[]): string[] {
  return classes.filter(
    (name) => name.startsWith("active:") || name.includes("gallery=press")
  )
}

describe("interaction", () => {
  it("lights a plain press exactly as much as a hover", () => {
    const light = classesOf("light")
    expect(light.filter((name) => name.startsWith("hover:"))).toEqual([
      "hover:after:opacity-10",
    ])
    expect(pressOf(light)).toEqual([
      "active:after:opacity-10",
      "in-data-[gallery=press]:after:opacity-10",
    ])
  })

  it("gives a press its own second light step where the reference darkens twice", () => {
    const lightPress = classesOf("lightPress")
    expect(lightPress.filter((name) => name.startsWith("hover:"))).toEqual([
      "hover:after:opacity-10",
    ])
    expect(pressOf(lightPress)).toEqual([
      "active:after:opacity-20",
      "in-data-[gallery=press]:after:opacity-20",
    ])
    expect(lightPress.filter((name) => /scale|translate/.test(name))).toEqual(
      []
    )
  })

  it("draws the focus ring its own width outside the control's edge", () => {
    const offsets = classesOf("ring").filter((name) =>
      name.includes("outline-offset")
    )
    expect(offsets).toEqual([
      "focus-visible:outline-offset-(--spacing-focus-ring)",
      "in-data-[gallery=focus]:outline-offset-(--spacing-focus-ring)",
    ])
  })

  it("draws the base focus ring outside the edge too, for a control without the ring class", () => {
    const globals = readSource("styles/globals.css")
    const rule = /\n {2}:focus-visible \{([^}]*)\}/.exec(globals)?.[1] ?? ""
    expect(rule).toContain("outline: var(--spacing-focus-ring) solid")
    expect(rule).toContain("outline-offset: var(--spacing-focus-ring);")
  })

  it("draws a covering control's ring on the clipping host it covers, outside the host's edge", () => {
    expect(classesOf("cover")).toEqual(["focus-visible:outline-none"])
    expect(classesOf("ringHost")).toEqual(
      expect.arrayContaining([
        "has-[>[data-cover]:focus-visible]:outline-solid",
        "has-[>[data-cover]:focus-visible]:outline-(length:--spacing-focus-ring)",
        "has-[>[data-cover]:focus-visible]:outline-offset-(--spacing-focus-ring)",
      ])
    )
  })

  it("leaves a scroller room for a ring of two focus ring widths without moving its content", () => {
    expect(classesOf("ringRoom")).toEqual([
      "-m-[calc(var(--spacing-focus-ring)*2)]",
      "p-[calc(var(--spacing-focus-ring)*2)]",
    ])
    expect(classesOf("ringRoomBlock")).toEqual([
      "-my-[calc(var(--spacing-focus-ring)*2)]",
      "py-[calc(var(--spacing-focus-ring)*2)]",
    ])
    expect(classesOf("ringScroll")).toEqual([
      "scroll-p-[calc(var(--spacing-focus-ring)*2)]",
      "scroll-pb-[calc(var(--spacing-focus-ring)*2+var(--covered-bottom,0px))]",
    ])
  })

  it("removes the reveal's fade under reduced motion", () => {
    expect(classesOf("reveal")).toContain("motion-reduce:transition-none")
  })
})
