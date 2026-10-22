import { Chip } from "@rosesfield/ui/components/chip"
import {
  ModelPicker,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
import { ModelRow } from "@rosesfield/ui/components/model-row"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const sections: ModelPickerSection[] = [
  {
    id: "featured",
    label: "Your models",
    rows: [
      {
        id: "maker/picture-2",
        name: "Picture 2",
        maker: "Maker",
        tags: [],
      },
    ],
  },
  {
    id: "Studio",
    label: "Studio",
    rows: [
      {
        id: "studio/clip-3",
        name: "Clip 3",
        maker: "Studio",
        tags: [{ label: "1080p" }, { label: "5 to 10 s" }],
      },
      {
        id: "studio/sketch-1",
        name: "Sketch 1",
        maker: "Studio",
        tags: [{ label: "Open weights" }],
      },
    ],
  },
]

const badged: ModelPickerSection[] = [
  {
    id: "featured",
    label: "Featured",
    rows: [
      {
        id: "maker/model-4",
        name: "Model 4",
        maker: "Maker",
        tags: [],
        mark: <svg data-testid="mark" aria-hidden="true" />,
        badges: [
          { kind: "new", label: "New" },
          {
            kind: "openWeights",
            label: "Open weights",
            href: "https://huggingface.co/maker/model-4",
          },
        ],
      },
    ],
  },
]

function rowOf(name: string): HTMLElement {
  const row = screen
    .getByRole("option", { name })
    .closest<HTMLElement>("[data-slot='model-row']")
  if (row === null) {
    throw new Error(`no row for ${name}`)
  }
  return row
}

function open(onChoose = vi.fn(), shown: ModelPickerSection[] = sections) {
  render(
    <ModelPicker
      trigger={<Chip>Picture 2</Chip>}
      title="Model"
      searchLabel="Search models"
      searchPlaceholder="Search by name or maker"
      emptyLabel="No model matches"
      sections={shown}
      chosen="maker/picture-2"
      onChoose={onChoose}
      open
    />
  )
  return onChoose
}

afterEach(cleanup)

describe("ModelPicker", () => {
  it("shows the first group, then each maker, with a check on the chosen model", () => {
    open()
    const groups = screen
      .getAllByRole("group")
      .map((group) => group.getAttribute("aria-label"))
    expect(groups).toEqual(["Your models", "Studio"])
    const chosen = screen.getByRole("option", { selected: true })
    expect(chosen.getAttribute("aria-label")).toBe("Picture 2")
    expect(
      rowOf("Picture 2").querySelector("[data-slot='model-row-check'] svg")
    ).not.toBeNull()
    expect(
      rowOf("Clip 3").querySelector("[data-slot='model-row-check'] svg")
    ).toBeNull()
    expect(screen.getAllByRole("option", { selected: false })).toHaveLength(2)
  })

  it("shows up to three capability facts on one caption line in the neutral tone", () => {
    open()
    const facts = within(rowOf("Clip 3")).getAllByText(/1080p|5 to 10 s/)
    expect(facts).toHaveLength(2)
    for (const fact of facts) {
      const line = fact.closest("[data-slot='model-row-capabilities']")
      expect(line?.className.split(" ")).toEqual(
        expect.arrayContaining(["text-caption", "text-ink-muted"])
      )
      expect(fact.className).not.toMatch(/bug|cem|hor|nop/)
      expect(fact.className).not.toMatch(/truncate/)
      expect(fact.className.split(" ")).toContain("shrink-0")
      expect(line?.className.split(" ")).toEqual(
        expect.arrayContaining([
          "flex-wrap",
          "overflow-hidden",
          "h-(--text-caption--line-height)",
        ])
      )
    }
  })

  it("never shows more than three facts", () => {
    render(
      <ModelPicker
        trigger={<Chip>Many</Chip>}
        title="Model"
        searchLabel="Search models"
        searchPlaceholder="Search by name or maker"
        emptyLabel="No model matches"
        sections={[
          {
            id: "all",
            label: "All",
            rows: [
              {
                id: "a/many",
                name: "Many",
                maker: "A",
                tags: ["One", "Two", "Three", "Four"].map((label) => ({
                  label,
                })),
              },
            ],
          },
        ]}
        chosen={null}
        onChoose={() => undefined}
        open
      />
    )
    expect(
      rowOf("Many").querySelectorAll("[data-slot='model-row-capability']")
    ).toHaveLength(3)
  })

  it("puts the badges after the name and links Open weights to its page", () => {
    open(vi.fn(), badged)
    const row = rowOf("Model 4")
    const badges = [...row.querySelectorAll("[data-slot='badge']")]
    expect(badges.map((badge) => badge.getAttribute("data-kind"))).toEqual([
      "new",
      "openWeights",
    ])
    const weights = within(row).getByRole("link", {
      name: "huggingface.co/maker/model-4",
    })
    expect(weights.getAttribute("href")).toBe(
      "https://huggingface.co/maker/model-4"
    )
    expect(weights.getAttribute("rel")).toBe("noopener noreferrer")
  })

  it("shows the lab's mark in a tile and no picture in the list", () => {
    open(vi.fn(), badged)
    const list = screen.getByRole("listbox", { name: "Model" })
    expect(list.querySelectorAll("img, video")).toHaveLength(0)
    expect(
      rowOf("Model 4").querySelector(
        "[data-slot='model-row-mark'] [data-testid='mark']"
      )
    ).not.toBeNull()
  })

  it("holds the chosen model's settings under the list", () => {
    render(
      <ModelPicker
        trigger={<Chip>Picture 2</Chip>}
        title="Model"
        searchLabel="Search models"
        searchPlaceholder="Search by name or maker"
        emptyLabel="No model matches"
        sections={sections}
        chosen="maker/picture-2"
        onChoose={() => undefined}
        settings={<p>Safety tolerance</p>}
        open
      />
    )
    const list = screen.getByRole("listbox", { name: "Model" })
    const setting = screen.getByText("Safety tolerance")
    expect(
      list.compareDocumentPosition(setting) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("filters the rows by name and by maker", () => {
    open()
    const search = screen.getByRole("searchbox", { name: "Search models" })
    fireEvent.change(search, { target: { value: "sketch" } })
    expect(
      screen.getAllByRole("option").map((one) => one.dataset.model)
    ).toEqual(["studio/sketch-1"])
    fireEvent.change(search, { target: { value: "studio" } })
    expect(screen.getAllByRole("option")).toHaveLength(2)
    fireEvent.change(search, { target: { value: "nothing" } })
    expect(screen.getByText("No model matches")).toBeTruthy()
  })

  it("chooses the model you press", () => {
    const onChoose = open()
    fireEvent.click(screen.getByRole("option", { name: "Sketch 1" }))
    expect(onChoose).toHaveBeenCalledWith("studio/sketch-1")
  })

  it("shows only the notice when the catalog was refused", () => {
    render(
      <ModelPicker
        trigger={<Chip>Model</Chip>}
        title="Model"
        searchLabel="Search models"
        searchPlaceholder="Search by name or maker"
        emptyLabel="No model matches"
        sections={[]}
        chosen={null}
        onChoose={() => undefined}
        notice={<p>Your key belongs to no workspace</p>}
        open
      />
    )
    expect(screen.getByText("Your key belongs to no workspace")).toBeTruthy()
    expect(screen.queryByText("No model matches")).toBeNull()
  })
})

describe("ModelPicker's Open weights link", () => {
  it("sits outside the option, so a click on the mark never chooses the row, and a click on the words does", () => {
    const onChoose = open(vi.fn(), badged)
    const option = screen.getByRole("option", { name: "Model 4" })
    const weights = within(rowOf("Model 4")).getByRole("link", {
      name: "huggingface.co/maker/model-4",
    })
    expect(option.contains(weights)).toBe(false)
    expect(weights.closest("[role='option']")).toBeNull()
    expect(option.querySelector("a, button")).toBeNull()
    fireEvent.click(weights)
    expect(onChoose).not.toHaveBeenCalled()
    fireEvent.click(option)
    expect(onChoose).toHaveBeenCalledWith(option.dataset.model)
  })
})

describe("ModelPicker's Open weights place", () => {
  it("rides 4 px after the name on the name's line, and only its 12 px mark takes the pointer", () => {
    open(vi.fn(), badged)
    const row = rowOf("Model 4")
    const weights = row.querySelector("[data-slot='model-row-weights']")
    const name = row.querySelector("[data-slot='model-row-name']")
    expect(name?.parentElement?.contains(weights ?? null)).toBe(true)
    expect(name?.parentElement?.lastElementChild).toBe(weights)
    expect(
      row
        .querySelector("[data-slot='model-row-price']")
        ?.previousElementSibling?.contains(weights ?? null)
    ).toBe(true)
    expect(weights?.className.split(" ")).toContain("shrink-0")
    expect(weights?.className.split(" ")).not.toContain("pointer-events-auto")
    const badge = weights?.querySelector("[data-slot='badge']")
    expect(badge?.className.split(" ")).toEqual(
      expect.arrayContaining(["ms-1", "[&_svg]:size-3"])
    )
    expect(badge?.className.split(" ")).not.toContain("pointer-events-auto")
    const link = badge?.querySelector("a")
    expect(link?.className.split(" ")).toEqual(
      expect.arrayContaining(["pointer-events-auto", "relative", "z-10"])
    )
    expect(
      link?.querySelector("[data-slot='hugging-face-mark']")
    ).not.toBeNull()
    expect(
      badge?.querySelector("[data-slot='count-badge-words']")?.closest("a")
    ).toBeNull()
  })
})

describe("ModelPicker's rows and motion", () => {
  it("sets each row's 33 px mark tile on its ground's well and the check muted at the end", () => {
    open()
    const tile = rowOf("Clip 3").querySelector("[data-slot='model-row-mark']")
    expect(tile?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "size-icon-dense",
        "bg-(--well)",
        "[&_svg]:glyph-small",
      ])
    )
    expect(
      rowOf("Picture 2").querySelector("[data-slot='model-row-check']")
        ?.className
    ).toContain("text-ink-muted")
  })

  it("opens on the popover preset over the thick material, growing from its chip", () => {
    open()
    const list = document.querySelector("[data-slot='model-picker']")
    const classes = list?.className.split(" ") ?? []
    expect(classes).toEqual(
      expect.arrayContaining(["motion-popover", "material-thick"])
    )
    expect(classes.filter((name) => name.includes("translate-y"))).toEqual([])
    expect(list?.getAttribute("data-material")).toBe("thick")
  })
})

describe("ModelRow's price slot", () => {
  it("holds a skeleton while pending, the figure after the coin when known, and nothing when no price exists, at one height", () => {
    const row = { id: "a/one", name: "One", maker: "A", tags: [] }
    const heights: string[] = []
    const states: (string | null | undefined)[] = []
    for (const [price, isPricing] of [
      [undefined, true],
      [{ amount: "6.5", name: "6.5 credits" }, false],
      [undefined, false],
    ] as const) {
      const { container } = render(
        <ModelRow
          row={price === undefined ? row : { ...row, price }}
          isChosen={false}
          isPricing={isPricing}
          onChoose={() => undefined}
        />
      )
      const slot = container.querySelector("[data-slot='model-row-price']")
      states.push(slot?.getAttribute("data-state"))
      heights.push(
        container.querySelector("[data-slot='model-row']")?.className ?? ""
      )
      if (price === undefined && isPricing) {
        expect(
          slot?.querySelector("[data-slot='model-row-price-loading']")
        ).not.toBeNull()
      } else if (price !== undefined) {
        const figure = slot?.querySelector("[data-slot='credit-price']")
        expect(figure?.textContent).toBe("6.5")
        expect(figure?.firstElementChild?.tagName.toLowerCase()).toBe("svg")
      } else {
        expect(slot?.childElementCount).toBe(0)
        expect(slot?.className.split(" ")).toEqual(
          expect.arrayContaining(["data-[state=none]:w-0"])
        )
      }
      expect(container.textContent).not.toMatch(/unknown/i)
      cleanup()
    }
    expect(states).toEqual(["pending", "known", "none"])
    expect(new Set(heights).size).toBe(1)
    expect(heights[0]).toContain("h-13")
  })
})
