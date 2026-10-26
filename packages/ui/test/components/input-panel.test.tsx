import {
  InputPanel,
  PromptBlock,
  SettingTiles,
} from "@rosesfield/ui/components/input-panel"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight")
  Reflect.deleteProperty(HTMLElement.prototype, "clientHeight")
})

function partsAt(scrollHeight: number, clientHeight: number): Element | null {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    }
  )
  Object.defineProperties(HTMLElement.prototype, {
    scrollHeight: { configurable: true, get: () => scrollHeight },
    clientHeight: { configurable: true, get: () => clientHeight },
  })
  render(
    <InputPanel label="Inputs" footer={<button type="button">Generate</button>}>
      <span>Part</span>
    </InputPanel>
  )
  return screen
    .getByRole("region", { name: "Inputs" })
    .querySelector("[data-slot='composer-prompt']")
}

describe("InputPanel's parts", () => {
  it("fade out over the footer, with room for the last part above Generate, only while they overflow", () => {
    const clipped = partsAt(900, 600)
    expect(clipped?.getAttribute("data-clipped")).toBe("yes")
    expect(clipped?.className.split(" ")).toContain("pb-s12")
    cleanup()
    const fits = partsAt(400, 600)
    expect(fits?.getAttribute("data-clipped")).toBe("no")
    expect(fits?.className).not.toContain("mask-image")
    expect(fits?.className.split(" ")).toContain("p-s3")
  })
})

describe("InputPanel", () => {
  it("insets its tabs by the same 10 px as its parts", () => {
    render(
      <InputPanel
        label="Inputs"
        tabs={<span>Tabs</span>}
        footer={<button type="button">Generate</button>}
      >
        <span>Part</span>
      </InputPanel>
    )
    const tray = document.querySelector("[data-slot='composer-tray']")
    expect(tray?.className.split(" ")).toEqual(
      expect.arrayContaining(["px-s3", "pt-s3"])
    )
  })

  it("is a 320 px column whose tray, parts and footer share the bar composer's 10 px inset, the parts 10 px apart", () => {
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
      expect.arrayContaining(["gap-s3", "p-s3", "overflow-y-auto"])
    )
    const footer = panel.querySelector("[data-slot='composer-toolbar']")
    expect(footer?.className.split(" ")).toEqual(
      expect.arrayContaining(["px-s3", "pb-s3"])
    )
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
