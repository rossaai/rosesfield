import { Input } from "@rosesfield/ui/components/input"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { readSource } from "../read-source"

afterEach(cleanup)

const ring = [
  "focus-visible:outline-(length:--spacing-focus-ring)",
  "focus-visible:outline-solid",
  "focus-visible:outline-hor-text",
  "focus-visible:outline-offset-(--spacing-focus-ring)",
]

describe("Input and Textarea focus", () => {
  it("draw the focus ring outside the field's edge, over the base rule that hides it on a field", () => {
    const globals = readSource("styles/globals.css")
    expect(globals).toMatch(/input:focus-visible,[\s\S]*outline: none/)
    render(
      <>
        <Input aria-label="Search" />
        <Textarea aria-label="Words" />
      </>
    )
    for (const field of [
      screen.getByRole("textbox", { name: "Search" }),
      screen.getByRole("textbox", { name: "Words" }),
    ]) {
      expect(field.className.split(" ")).toEqual(expect.arrayContaining(ring))
    }
  })
})
