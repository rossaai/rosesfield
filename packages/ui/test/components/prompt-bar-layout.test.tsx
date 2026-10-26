import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function renderBar(): void {
  render(
    <PromptBar
      value="A red bicycle"
      onValueChange={() => undefined}
      onSubmit={() => undefined}
      label="Prompt"
      placeholder="Describe the image"
      submitLabel="Generate"
      removeLabel="Remove"
    />
  )
}

function renderSlots(): void {
  render(
    <PromptBar
      value=""
      onValueChange={() => undefined}
      onSubmit={() => undefined}
      label="Prompt"
      placeholder="Describe the image"
      submitLabel="Generate"
      removeLabel="Remove"
      slots={[
        {
          id: "product",
          label: "Product photo",
          items: [],
          addLabel: "Add a product photo",
          onAdd: () => undefined,
        },
        {
          id: "second",
          label: "Second photo",
          note: "Optional",
          items: [],
          addLabel: "Add a second photo",
          onAdd: () => undefined,
        },
      ]}
    />
  )
}

describe("PromptBar's slot groups", () => {
  it("holds each slot's name, its Optional and its add tile inside one well of its own", () => {
    renderSlots()
    for (const [name, add] of [
      ["Product photo", "Add a product photo"],
      ["Second photo", "Add a second photo"],
    ] as const) {
      const group = screen.getByRole("region", { name })
      expect(group.className.split(" ")).toEqual(
        expect.arrayContaining(["rounded-cell", "bg-(--well)", "p-s2"])
      )
      expect(group.firstElementChild?.textContent).toBe(
        name === "Second photo" ? `${name}Optional` : name
      )
      const tile = screen.getByRole("button", { name: add })
      expect(group.contains(tile)).toBe(true)
      expect(tile.className.split(" ")).toContain("bg-(--tint)")
      expect(tile.className.split(" ")).not.toContain("bg-(--well)")
    }
  })

  it("draws no line between the groups and the prompt", () => {
    renderSlots()
    const slots = document.querySelector("[data-slot='composer-slots']")
    expect(slots?.nextElementSibling?.getAttribute("data-slot")).toBe(
      "composer-prompt"
    )
    expect(document.querySelector("[data-slot='separator']")).toBeNull()
    expect(document.querySelector("[role='separator']")).toBeNull()
  })
})

describe("PromptBar's top inset", () => {
  it("starts the prompt's first line as far from the bar's top as from its left, with the toolbar and Generate held at the foot", () => {
    renderBar()
    const field = screen.getByRole("textbox", { name: "Prompt" })
    const classes = field.className.split(" ")
    expect(classes).toEqual(expect.arrayContaining(["px-s2", "pt-s2"]))
    expect(classes).not.toContain("pt-s1_5")
    const column = field.closest("[data-slot='composer-prompt']")?.parentElement
    const row = column?.parentElement
    expect(row?.className.split(" ")).not.toContain("items-end")
    const toolbar = document.querySelector("[data-slot='composer-toolbar']")
    expect(toolbar?.className.split(" ")).toContain("mt-auto")
    const generate = screen.getByRole("button", { name: "Generate" })
    expect(generate.className.split(" ")).toContain("self-end")
  })
})
