import {
  InputPanel,
  PromptBlock,
  SettingTiles,
} from "@rosesfield/ui/components/input-panel"
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

  it("joins the prompt to its chips, 126 px over a 46 px row that holds them 8 px from its top", () => {
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
      expect.arrayContaining([
        "h-11.5",
        "items-start",
        "pt-2",
        "rounded-b-cell",
      ])
    )
  })

  it("rings the whole prompt block while its field has keyboard focus", () => {
    render(
      <PromptBlock label="Prompt" chips={<span>Sound</span>}>
        <textarea aria-label="Prompt" />
      </PromptBlock>
    )
    const block = document.querySelector("[data-slot='composer-prompt-block']")
    expect(block?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "has-[textarea:focus-visible]:outline-solid",
        "has-[textarea:focus-visible]:outline-(length:--spacing-focus-ring)",
        "has-[textarea:focus-visible]:outline-offset-(--spacing-focus-ring)",
      ])
    )
  })

  it("scrolls a focused part into view with room for its ring", () => {
    render(
      <InputPanel
        label="Video"
        footer={<button type="button">Generate</button>}
      >
        <span>Part</span>
      </InputPanel>
    )
    const parts = document.querySelector("[data-slot='composer-prompt']")
    expect(parts?.className.split(" ")).toContain(
      "scroll-p-[calc(var(--spacing-focus-ring)*2)]"
    )
  })
})

describe("SettingTiles", () => {
  it("never narrows a tile below its own value, and shares the rest of the row", () => {
    render(
      <SettingTiles>
        <button type="button">5 seconds</button>
        <button type="button">16:9</button>
      </SettingTiles>
    )
    const row = document.querySelector("[data-slot='setting-tiles']")
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining(["*:min-w-max", "*:flex-1", "gap-2"])
    )
  })
})
