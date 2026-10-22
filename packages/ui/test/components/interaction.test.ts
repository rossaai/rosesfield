import { interaction } from "@rosesfield/ui/components/interaction"
import { describe, expect, it } from "vitest"
import { readSource } from "../read-source"

function classesOf(name: keyof typeof interaction): string[] {
  return interaction[name].split(" ")
}

describe("interaction", () => {
  it("holds no light overlay, so nothing draws over a control or a photo", () => {
    expect(Object.keys(interaction)).not.toContain("light")
    expect(Object.keys(interaction)).not.toContain("lightPress")
    for (const classes of Object.values(interaction)) {
      expect(classes).not.toContain("after:bg-current")
    }
  })

  it("tints a quiet control on hover with its ground's tint and leaves the timing to the press preset", () => {
    expect(classesOf("fill")).toEqual(
      expect.arrayContaining([
        "hover:bg-(--tint)",
        "in-data-[gallery=hover]:bg-(--tint)",
      ])
    )
    expect(
      classesOf("fill").filter((name) => /transition|duration/.test(name))
    ).toEqual([])
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

  it("reveals on the tint preset, which reduced motion shortens once", () => {
    expect(classesOf("reveal")).toContain("motion-tint")
    expect(
      classesOf("reveal").filter((name) => /transition|duration/.test(name))
    ).toEqual([])
    const motion = readSource("styles/motion.css")
    expect(motion).toMatch(/--tint-change: var\(--duration-reduced\)/)
  })
})
