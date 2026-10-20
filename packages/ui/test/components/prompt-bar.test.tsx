import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { COMPOSER } from "@rosesfield/ui/contracts/composer.generated"
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

describe("PromptBar's composer slots", () => {
  it("orders its contract's tray, attachments, prompt, notices and toolbar", () => {
    render(
      <PromptBar
        value=""
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Generate"
        removeLabel="Remove"
        tray={<span>Reply</span>}
        notices={<span>Your key is missing</span>}
        attachments={[{ id: "one", src: "one.png", alt: "A reference" }]}
      />
    )
    const order = [
      ...document.querySelectorAll("[data-slot^='composer-']"),
    ].map((element) =>
      element.getAttribute("data-slot")?.replace("composer-", "")
    )
    expect(order).toEqual([...COMPOSER.slots])
  })
})

describe("PromptBar's prompt height", () => {
  it("sets the field's height from its text and moves it on the control timing", () => {
    const { rerender } = render(
      <PromptBar
        value="one line"
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Generate"
        removeLabel="Remove"
      />
    )
    const field = screen.getByRole("textbox", { name: "Prompt" })
    expect(field.className).toContain(
      "[transition:height_var(--control-change)]"
    )
    expect(field.className).not.toContain("field-sizing-content")
    Object.defineProperty(field, "scrollHeight", {
      configurable: true,
      get: () => 120,
    })
    rerender(
      <PromptBar
        value={"one line\ntwo\nthree\nfour"}
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Generate"
        removeLabel="Remove"
      />
    )
    expect(field.style.height).toBe("120px")
  })
})

describe("PromptBar's chip row", () => {
  it("holds the chips in a sideways row with a hidden 28 px arrow at each end while nothing overflows", () => {
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
    expect(row?.className).toContain("overflow-x-auto")
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "-m-[calc(var(--spacing-focus-ring)*2)]",
        "p-[calc(var(--spacing-focus-ring)*2)]",
      ])
    )
    expect(row?.textContent).toBe("Aspect")
    const arrows = [
      ...document.querySelectorAll("[data-slot='chip-row-arrow']"),
    ]
    expect(arrows.map((arrow) => arrow.getAttribute("data-end"))).toEqual([
      "back",
      "forward",
    ])
    for (const arrow of arrows) {
      expect(arrow.className.split(" ")).toEqual(
        expect.arrayContaining(["size-7", "opacity-0"])
      )
    }
  })

  it("draws no chip row or arrows when it is given no chips, as in the phone's sheet", () => {
    renderBar()
    expect(document.querySelector("[data-slot='chip-row']")).toBeNull()
    expect(document.querySelector("[data-slot='chip-row-arrow']")).toBeNull()
    expect(
      document.querySelector("[data-slot='composer-toolbar']")
    ).not.toBeNull()
  })

  it("shows the forward arrow once the chips overflow, and scrolls when pressed", () => {
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
    const row = document.querySelector<HTMLElement>("[data-slot='chip-row']")
    if (row === null) {
      throw new Error("no chip row")
    }
    Object.defineProperty(row, "scrollWidth", {
      configurable: true,
      get: () => 400,
    })
    Object.defineProperty(row, "clientWidth", {
      configurable: true,
      get: () => 200,
    })
    const scrollBy = vi.fn()
    row.scrollBy = scrollBy
    fireEvent.scroll(row)
    const forward = document.querySelector<HTMLElement>(
      "[data-slot='chip-row-arrow'][data-end='forward']"
    )
    expect(forward?.className).toContain("opacity-100")
    if (forward !== null) {
      fireEvent.click(forward)
    }
    expect(scrollBy).toHaveBeenCalledWith({ left: 200, behavior: "smooth" })
  })
})
