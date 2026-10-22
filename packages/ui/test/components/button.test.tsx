import { Button, IconButton } from "@rosesfield/ui/components/button"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { readSource } from "../read-source"

afterEach(cleanup)

describe("Button", () => {
  it("runs its act when pressed", () => {
    const press = vi.fn()
    render(<Button onClick={press}>Generate</Button>)
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(press).toHaveBeenCalledTimes(1)
  })

  it("keeps its name and takes no press while busy", () => {
    const press = vi.fn()
    render(
      <Button busy onClick={press}>
        Generate
      </Button>
    )
    const button = screen.getByRole("button", { name: "Generate" })
    fireEvent.click(button)
    expect(press).not.toHaveBeenCalled()
    expect(button.getAttribute("aria-busy")).toBe("true")
  })
})

describe("IconButton", () => {
  it("sits as a clear circle when quiet, and takes its ground's tint on hover, open and on", () => {
    render(
      <IconButton label="Open the menu" tone="quiet">
        <svg aria-hidden="true" />
      </IconButton>
    )
    const classes = screen
      .getByRole("button", { name: "Open the menu" })
      .className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining([
        "bg-transparent",
        "rounded-full",
        "hover:bg-(--tint)",
        "aria-expanded:bg-(--tint)",
        "aria-pressed:bg-(--tint)",
      ])
    )
    expect(classes).not.toContain("bg-(--well)")
  })
})

function classesOf(name: string): string[] {
  return screen.getByRole("button", { name }).className.split(" ")
}

const motionCss = readSource("styles/motion.css")
const tokens = readSource("tokens.css")

function pressScaleOf(utility: string): string | undefined {
  const block = motionCss.slice(motionCss.indexOf(`@utility ${utility} {`))
  return /(?:--press-scale: |scale\(var\(--press-scale, )var\((--scale-press-[a-z]+)\)/.exec(
    block
  )?.[1]
}

function tokenOf(name: string): string | undefined {
  return new RegExp(`${name}: ([0-9.]+);`).exec(tokens)?.[1]
}

describe("Button's press", () => {
  it("yields a capsule to 0.96 and a circle to 0.94 on the press preset", () => {
    render(
      <>
        <Button>Generate</Button>
        <IconButton label="Close">
          <svg aria-hidden="true" />
        </IconButton>
      </>
    )
    expect(classesOf("Generate")).toContain("motion-press")
    expect(classesOf("Generate")).not.toContain("motion-press-round")
    expect(classesOf("Close")).toEqual(
      expect.arrayContaining(["motion-press", "motion-press-round"])
    )
    const capsule = pressScaleOf("motion-press")
    const round = pressScaleOf("motion-press-round")
    expect(capsule).toBe("--scale-press-capsule")
    expect(round).toBe("--scale-press-round")
    expect(tokenOf(capsule ?? "")).toBe("0.96")
    expect(tokenOf(round ?? "")).toBe("0.94")
  })

  it("draws no light over any tone, so a surface keeps its own well colour on hover", () => {
    const tones = [
      "surface",
      "primary",
      "accent",
      "quiet",
      "muted",
      "canvas",
      "danger",
      "glass",
    ] as const
    render(
      tones.map((tone) => (
        <Button key={tone} tone={tone}>
          {tone}
        </Button>
      ))
    )
    for (const tone of tones) {
      const classes = classesOf(tone)
      expect(classes.filter((name) => name.includes("after:"))).toEqual([])
    }
    expect(
      classesOf("surface").filter((name) => name.startsWith("hover:bg"))
    ).toEqual([])
    expect(classesOf("quiet")).toContain("hover:bg-(--tint)")
    expect(classesOf("muted")).toContain("hover:bg-(--tint)")
  })

  it("edges the glass tone with the hairline and the float shadow", () => {
    render(<Button tone="glass">Next</Button>)
    expect(classesOf("Next")).toEqual(
      expect.arrayContaining([
        "material-thin",
        "border",
        "border-surface-2",
        "shadow-float",
      ])
    )
  })
})

describe("Button's sizes", () => {
  it("stands 40, 33 and 26 tall as a capsule, and takes its region's density by default", () => {
    render(
      <>
        <Button>Chrome</Button>
        <Button size="dense">Dense</Button>
        <Button size="small">Small</Button>
      </>
    )
    expect(classesOf("Chrome")).toEqual(
      expect.arrayContaining([
        "h-field",
        "in-data-[density=composer]:h-button-dense",
        "in-data-[density=row]:h-button-small",
        "rounded-full",
      ])
    )
    expect(classesOf("Dense")).toContain("h-button-dense")
    expect(classesOf("Small")).toContain("h-button-small")
  })

  it("stands 36, 33 and 26 as a circle, and takes its region's density by default", () => {
    render(
      <>
        <IconButton label="Chrome">
          <svg aria-hidden="true" />
        </IconButton>
        <IconButton label="Dense" size="dense">
          <svg aria-hidden="true" />
        </IconButton>
        <IconButton label="Small" size="small">
          <svg aria-hidden="true" />
        </IconButton>
      </>
    )
    expect(classesOf("Chrome")).toEqual(
      expect.arrayContaining([
        "size-icon",
        "in-data-[density=composer]:size-icon-dense",
        "in-data-[density=row]:size-icon-small",
      ])
    )
    expect(classesOf("Dense")).toContain("size-icon-dense")
    expect(classesOf("Small")).toContain("size-icon-small")
  })

  it("draws its focus ring its own width outside its edge", () => {
    render(
      <IconButton label="Close">
        <svg aria-hidden="true" />
      </IconButton>
    )
    expect(classesOf("Close")).toEqual(
      expect.arrayContaining([
        "focus-visible:outline-offset-(--spacing-focus-ring)",
        "in-data-[gallery=focus]:outline-offset-(--spacing-focus-ring)",
      ])
    )
  })
})
