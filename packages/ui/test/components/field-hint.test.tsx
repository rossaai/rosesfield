import { FieldHint } from "@rosesfield/ui/components/field"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { act } from "react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

const words = "Triangles suit games. Quads suit editing."

describe("FieldHint", () => {
  it("is a button named for its setting that shows its words on hover", async () => {
    render(<FieldHint label="About Topology" text={words} place="hover" />)
    const mark = screen.getByRole("button", { name: "About Topology" })
    expect(mark.querySelector("svg.lucide-circle-question-mark")).not.toBeNull()
    expect(screen.queryByText(words)).toBeNull()
    fireEvent.pointerEnter(mark, { pointerType: "mouse" })
    fireEvent.mouseEnter(mark)
    fireEvent.mouseMove(mark)
    expect(
      await screen.findByText(words, undefined, { timeout: 2000 })
    ).toBeTruthy()
  })

  it("shows its words when the mark takes keyboard focus", async () => {
    render(<FieldHint label="About Topology" text={words} place="hover" />)
    const mark = screen.getByRole("button", { name: "About Topology" })
    fireEvent.keyDown(document.body, { key: "Tab" })
    act(() => mark.focus())
    expect(await screen.findByText(words)).toBeTruthy()
  })

  it("shows the same words in a popover on a tap", async () => {
    render(<FieldHint label="About Topology" text={words} place="tap" />)
    const mark = screen.getByRole("button", { name: "About Topology" })
    expect(screen.queryByText(words)).toBeNull()
    fireEvent.click(mark)
    const shown = await screen.findByText(words)
    expect(shown.closest("[data-slot='popover-content']")).not.toBeNull()
  })
})
