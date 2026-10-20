import { InputPanel, PromptBlock } from "@rosesfield/ui/components/input-panel"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("InputPanel", () => {
  it("is a 320 px column whose parts sit 8 px apart over a 60 px footer that holds Generate", () => {
    render(
      <InputPanel
        label="Inputs"
        footer={<button type="button">Generate</button>}
      >
        <PromptBlock label="Prompt" chips={<span>Sound</span>}>
          <textarea aria-label="Prompt" />
        </PromptBlock>
      </InputPanel>
    )
    const panel = screen.getByRole("region", { name: "Inputs" })
    expect(panel.className.split(" ")).toContain("w-80")
    const parts = panel.querySelector("[data-slot='composer-prompt']")
    expect(parts?.className.split(" ")).toEqual(
      expect.arrayContaining(["gap-2", "p-2", "overflow-y-auto"])
    )
    const footer = panel.querySelector("[data-slot='composer-toolbar']")
    expect(footer?.className.split(" ")).toContain("h-15")
    expect(footer?.textContent).toBe("Generate")
  })

  it("joins the prompt to its chips, 126 px over a 40 px row", () => {
    render(
      <PromptBlock label="Prompt" chips={<span>Sound</span>}>
        <textarea aria-label="Prompt" />
      </PromptBlock>
    )
    const block = screen.getByRole("textbox", { name: "Prompt" }).parentElement
    expect(block?.className.split(" ")).toEqual(
      expect.arrayContaining(["h-31.5", "rounded-t-cell"])
    )
    expect(block?.nextElementSibling?.className.split(" ")).toEqual(
      expect.arrayContaining(["h-10", "rounded-b-cell"])
    )
  })
})
