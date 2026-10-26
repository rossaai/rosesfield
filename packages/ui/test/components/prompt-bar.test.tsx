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

  it("draws no prompt field for a run that reads no prompt, and keeps Generate", () => {
    const submit = vi.fn()
    render(
      <PromptBar
        value=""
        onValueChange={() => undefined}
        onSubmit={submit}
        label="Prompt"
        placeholder=""
        submitLabel="Generate"
        removeLabel="Remove"
        prompt="none"
      />
    )
    expect(screen.queryByRole("textbox")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(submit).toHaveBeenCalledTimes(1)
  })
})

describe("PromptBar's vessel", () => {
  it("is the one kernel composer: a surface vessel at the 26 px radius and 10 px padding, with no second frame", () => {
    renderBar()
    const vessel = document.querySelector<HTMLElement>("[data-bar='prompt']")
    expect(vessel?.getAttribute("data-slot")).toBe("composer")
    expect(vessel?.getAttribute("data-density")).toBe("composer")
    expect(vessel?.getAttribute("data-ground")).toBe("surface")
    expect(vessel?.className.split(" ")).toEqual(
      expect.arrayContaining(["bg-surface", "rounded-vessel", "p-s3"])
    )
    expect(vessel?.className).not.toContain("bg-surface-2")
    expect(vessel?.querySelector("[class*='rounded-card']")).toBeNull()
  })

  it("floats over media with the float shadow only when docked", () => {
    render(
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
    const vessel = document.querySelector("[data-bar='prompt']")
    expect(vessel?.className.split(" ")).toContain("shadow-float")
    expect(vessel?.getAttribute("data-floating")).toBe("yes")
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

  it("stands as the 13 px radius tile at the bar's trailing end", () => {
    renderBar()
    const bar = document.querySelector("[data-bar='prompt']")
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
    const bar = document.querySelector<HTMLElement>("[data-bar='prompt']")
    expect(bar?.className.split(" ")).toEqual(
      expect.arrayContaining(["fixed", "bottom-s5", "max-w-220"])
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
  it("sets the field's height from its text and moves it on the yield preset", () => {
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
    expect(field.className.split(" ")).toContain("motion-yield")
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
  it("holds the chips in a sideways row with an edge fade and a hidden 26 px arrow at each end while nothing overflows", () => {
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
      "start",
      "end",
    ])
    for (const arrow of arrows) {
      expect(arrow.className.split(" ")).toEqual(
        expect.arrayContaining(["size-icon-small", "opacity-0", "motion-tint"])
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
      "[data-slot='chip-row-arrow'][data-end='end']"
    )
    expect(forward?.className).toContain("opacity-100")
    expect(row.style.maskImage).toContain("transparent")
    if (forward !== null) {
      fireEvent.click(forward)
    }
    expect(scrollBy).toHaveBeenCalledWith({ left: 100, behavior: "smooth" })
  })

  it("draws each asset slot with its label, its thumbs and an add tile", () => {
    const add = vi.fn()
    const remove = vi.fn()
    render(
      <PromptBar
        value=""
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        label="Prompt"
        placeholder="Describe the image"
        submitLabel="Generate"
        removeLabel="Remove"
        onRemoveAttachment={remove}
        slots={[
          {
            id: "product",
            label: "Product photo",
            items: [{ id: "a1", src: "data:,", alt: "Bottle" }],
            addLabel: "Add an image",
          },
          {
            id: "second",
            label: "Second photo",
            note: "Optional",
            items: [],
            addLabel: "Add an image",
            onAdd: add,
          },
        ]}
      />
    )
    const product = screen.getByRole("region", { name: "Product photo" })
    expect(product.querySelector("img")?.getAttribute("alt")).toBe("Bottle")
    expect(
      product.querySelector("button[aria-label='Add an image']")
    ).toBeNull()
    const second = screen.getByRole("region", { name: "Second photo" })
    expect(second.textContent).toContain("Optional")
    fireEvent.click(screen.getByRole("button", { name: "Add an image" }))
    expect(add).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    expect(remove).toHaveBeenCalledWith("a1")
  })
})
