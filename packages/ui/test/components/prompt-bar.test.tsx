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
