import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type Rendered = { submit: ReturnType<typeof vi.fn>; field: HTMLElement }

function renderBar(options: { busy?: boolean } = {}): Rendered {
  const submit = vi.fn()
  render(
    <PromptBar
      value="A red bicycle"
      onValueChange={() => undefined}
      onSubmit={submit}
      label="Prompt"
      placeholder="Describe the image"
      submitLabel="Generate"
      removeLabel="Remove"
      busy={options.busy ?? false}
    />
  )
  return { submit, field: screen.getByRole("textbox", { name: "Prompt" }) }
}

afterEach(cleanup)

describe("PromptBar", () => {
  it("submits once when you press Enter", () => {
    const { submit, field } = renderBar()
    fireEvent.keyDown(field, { key: "Enter" })
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it("breaks a line instead of submitting on Shift and Enter", () => {
    const { submit, field } = renderBar()
    fireEvent.keyDown(field, { key: "Enter", shiftKey: true })
    expect(submit).not.toHaveBeenCalled()
  })

  it("does not submit while an input method composes a word", () => {
    const { submit, field } = renderBar()
    fireEvent.keyDown(field, { key: "Enter", isComposing: true })
    expect(submit).not.toHaveBeenCalled()
  })

  it("takes no second submit while busy, from Enter or from Generate", () => {
    const { submit, field } = renderBar({ busy: true })
    fireEvent.keyDown(field, { key: "Enter" })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(submit).not.toHaveBeenCalled()
  })

  it("submits when you press Generate", () => {
    const { submit } = renderBar()
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(submit).toHaveBeenCalledTimes(1)
  })
})

describe("PromptBar's Generate", () => {
  it("holds its label, then the price, and names both", () => {
    render(
      <PromptBar
        value=""
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Generate"
        submitValue={<span data-testid="price">14.48</span>}
        submitName="Generate, 14.48 Comfy credits"
        removeLabel="Remove"
      />
    )
    const generate = screen.getByRole("button", {
      name: "Generate, 14.48 Comfy credits",
    })
    expect(generate.textContent).toBe("Generate14.48")
    const price = generate.querySelector("[data-slot='generate-button-price']")
    expect(price?.querySelector("[data-testid='price']")).not.toBeNull()
  })

  it("stands as the tile at the bar's trailing end", () => {
    renderBar()
    const bar = document.querySelector("[data-slot='prompt-bar']")
    const generate = screen.getByRole("button", { name: "Generate" })
    expect(generate.getAttribute("data-form")).toBe("tile")
    const controls = bar?.querySelectorAll("button, textarea") ?? []
    expect(controls[controls.length - 1]).toBe(generate)
  })
})

describe("PromptBar's placement", () => {
  it("docks to the viewport foot only when asked", () => {
    const { rerender } = render(
      <PromptBar
        value=""
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Generate"
        removeLabel="Remove"
        placement="dock"
      />
    )
    const bar = document.querySelector<HTMLElement>("[data-slot='prompt-bar']")
    expect(bar?.className.split(" ")).toEqual(
      expect.arrayContaining(["fixed", "bottom-4", "max-w-220"])
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
      />
    )
    expect(bar?.className.split(" ")).not.toContain("fixed")
  })
})
