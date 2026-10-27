import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

describe("PromptBar on a phone", () => {
  it("puts the field across the top and one row below it: the toolbar, then Generate fixed at its end", () => {
    render(
      <PromptBar
        value=""
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Generate"
        removeLabel="Remove"
        leading={<button type="button">Attach</button>}
        chips={<button type="button">Aspect</button>}
      />
    )
    const body = document.querySelector("[data-slot='prompt-body']")
    const classes = body?.className.split(" ") ?? []
    expect(classes).toEqual(
      expect.arrayContaining([
        "grid",
        "grid-cols-[minmax(0,1fr)_auto]",
        "[grid-template-areas:'content_content'_'tools_send']",
        "@regular:[grid-template-areas:'content_send'_'tools_send']",
      ])
    )
    const field = screen.getByRole("textbox", { name: "Prompt" })
    const content = field.closest("[class*='[grid-area:content]']")
    expect(content?.parentElement).toBe(body)
    const toolbar = document.querySelector("[data-slot='composer-toolbar']")
    expect(toolbar?.className.split(" ")).toContain("[grid-area:tools]")
    const generate = screen.getByRole("button", { name: "Generate" })
    expect(generate.parentElement).toBe(body)
    expect(generate.className.split(" ")).toEqual(
      expect.arrayContaining([
        "[grid-area:send]",
        "self-center",
        "@regular:self-end",
      ])
    )
    expect(toolbar?.contains(generate)).toBe(false)
  })

  it("scrolls its chips sideways with no visible scrollbar, and no chip shrinks", () => {
    render(
      <PromptBar
        value=""
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Generate"
        removeLabel="Remove"
        chips={<button type="button">Aspect</button>}
      />
    )
    const row = document.querySelector("[data-slot='chip-row']")
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "overflow-x-auto",
        "[scrollbar-width:none]",
        "[&::-webkit-scrollbar]:hidden",
        "*:shrink-0",
      ])
    )
  })

  it("gives Stop its square glyph, named Stop", () => {
    const stop = vi.fn()
    render(
      <PromptBar
        value=""
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Send"
        removeLabel="Remove"
        stop={{ label: "Stop", onStop: stop }}
      />
    )
    const button = screen.getByRole("button", { name: "Stop" })
    expect(
      button.querySelector("[data-slot='generate-button-glyph'] svg")
    ).not.toBeNull()
    fireEvent.click(button)
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it("keeps a figure in Generate's pill and shows a note in place of a figure only from the regular size", () => {
    const { rerender } = render(
      <PromptBar
        value=""
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Generate"
        removeLabel="Remove"
        price="No cost on the demo engine"
      />
    )
    const generate = screen.getByRole("button", { name: /^Generate/ })
    const price = (): string[] =>
      generate
        .querySelector("[data-slot='generate-button-price']")
        ?.className.split(" ") ?? []
    expect(generate.getAttribute("data-priced")).toBe("note")
    expect(price()).toEqual(
      expect.arrayContaining(["hidden", "@regular:inline-flex"])
    )
    rerender(
      <PromptBar
        value=""
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Generate"
        removeLabel="Remove"
        price="No cost on the demo engine"
        submitValue="12.5"
        submitName="Generate, 12.5 Comfy credits"
      />
    )
    expect(generate.getAttribute("data-priced")).toBe("yes")
    expect(price()).not.toContain("hidden")
    expect(price()).toEqual(
      expect.arrayContaining(["max-w-tile", "@regular:max-w-none"])
    )
  })
})
