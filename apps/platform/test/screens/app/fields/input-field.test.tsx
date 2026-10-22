import { findApp } from "@rosesfield/catalog"
import { appListing, type InputDefinition } from "@rosesfield/contract"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { InputField } from "@/screens/app/fields/input-field"

const audio = appListing.parse(findApp("audio"))

afterEach(cleanup)

function inputOf(name: string): InputDefinition {
  const input = audio.inputs.find((one) => one.name === name)
  if (input === undefined) {
    throw new Error(`audio has no ${name}`)
  }
  return input
}

function renderField(input: InputDefinition, value: unknown): void {
  render(
    <InputField
      app={audio}
      input={input}
      value={value}
      problem={undefined}
      onChange={() => undefined}
      register={() => undefined}
    />
  )
}

function captionsUnderLabel(): string[] {
  return [...document.querySelectorAll("[data-slot=field-note]")].map(
    (note) => note.textContent ?? ""
  )
}

describe("the Script field", () => {
  const script = inputOf("script")

  it("shows no character limit and no counter for a short script", () => {
    renderField(script, "a short line")
    expect(document.querySelector("[data-slot=prompt-count]")).toBeNull()
    expect(captionsUnderLabel()).toEqual([])
    expect(document.body.textContent).not.toContain(
      tCatalog("audio.input.script.note")
    )
  })

  it("counts inside the field once the script is near its limit", () => {
    renderField(script, "a".repeat(480))
    const count = document.querySelector("[data-slot=prompt-count]")
    expect(count?.textContent).toBe(
      t("field.prompt.count", { count: 480, max: 500 })
    )
    expect(count?.closest("[data-slot=prompt-field]")).not.toBeNull()
    expect(captionsUnderLabel()).toEqual([])
  })
})

describe("a number field", () => {
  it("shows no range line under the slider", () => {
    const number = audio.inputs.find(
      (one): one is Extract<InputDefinition, { type: "number" }> =>
        one.type === "number"
    )
    expect(number).toBeDefined()
    if (number === undefined) {
      return
    }
    renderField(number, number.default)
    expect(captionsUnderLabel()).toEqual([])
    expect(screen.queryByText(/\d to \d/)).toBeNull()
  })
})
