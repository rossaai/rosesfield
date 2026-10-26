import { ModelRow, rankToneOf } from "@rosesfield/ui/components/model-row"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  openBadge,
  openPicker,
  rowElementOf,
  rowOf,
} from "./model-picker-fixture"

const rows = [
  rowOf("maker/picture-2", { name: "Picture 2" }),
  rowOf("studio/clip-3", {
    name: "Clip 3",
    keywords: ["Studio"],
    capabilities: [{ label: "1080p" }, { label: "5 to 10 s" }],
  }),
  rowOf("studio/sketch-1", { name: "Sketch 1", keywords: ["Studio"] }),
]

const ranked = [
  rowOf("maker/model-4", {
    name: "Model 4",
    mark: <svg data-testid="mark" aria-hidden="true" />,
    rank: { place: 3, label: "#3", note: "Rank from Picture Arena" },
    badges: [{ kind: "new", label: "New" }, openBadge],
  }),
  rowOf("maker/model-5", { name: "Model 5" }),
]

function open(onChoose = vi.fn(), shown = rows) {
  openPicker({ rows: shown, chosen: "maker/picture-2", onChoose })
  return onChoose
}

afterEach(cleanup)

describe("ModelPicker", () => {
  it("shows one list with a check on the chosen model and no section heading while nothing is recent", () => {
    open()
    expect(document.querySelector("[data-slot='model-list-label']")).toBeNull()
    const chosen = screen.getByRole("option", { selected: true })
    expect(chosen.getAttribute("aria-label")).toBe("Picture 2")
    expect(
      rowElementOf("Picture 2").querySelector(
        "[data-slot='model-row-check'] svg"
      )
    ).not.toBeNull()
    expect(
      rowElementOf("Clip 3").querySelector("[data-slot='model-row-check'] svg")
    ).toBeNull()
    expect(screen.getAllByRole("option", { selected: false })).toHaveLength(2)
  })

  it("shows up to three capabilities on one caption line in the neutral tone", () => {
    open()
    const facts = within(rowElementOf("Clip 3")).getAllByText(/1080p|5 to 10 s/)
    expect(facts).toHaveLength(2)
    for (const fact of facts) {
      const line = fact.closest("[data-slot='model-row-capabilities']")
      expect(line?.className.split(" ")).toEqual(
        expect.arrayContaining([
          "text-caption",
          "text-ink-muted",
          "flex-wrap",
          "overflow-hidden",
          "h-(--text-caption--line-height)",
        ])
      )
      expect(fact.className).not.toMatch(/bug|cem|hor|nop|truncate/)
      expect(fact.className.split(" ")).toContain("shrink-0")
    }
  })

  it("never shows more than three capabilities", () => {
    open(vi.fn(), [
      rowOf("a/many", {
        name: "Many",
        capabilities: ["One", "Two", "Three", "Four"].map((label) => ({
          label,
        })),
      }),
    ])
    expect(
      rowElementOf("Many").querySelectorAll(
        "[data-slot='model-row-capability']"
      )
    ).toHaveLength(3)
  })

  it("puts New and Open weights after the name, and no rank among them", () => {
    open(vi.fn(), ranked)
    const row = rowElementOf("Model 4")
    const badges = [
      ...row.querySelectorAll(
        "[data-slot='model-row-name'] ~ * [data-slot='badge']"
      ),
    ]
    expect(badges.map((badge) => badge.getAttribute("data-kind"))).toEqual([
      "new",
      "openWeights",
    ])
    expect(row.querySelector("[data-slot='model-row-name']")?.textContent).toBe(
      "Model 4"
    )
  })

  it("filters the rows by name and by keyword", () => {
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
    openPicker({ rows: [], notice: <p>Your key belongs to no workspace</p> })
    expect(screen.getByText("Your key belongs to no workspace")).toBeTruthy()
    expect(screen.queryByText("No model matches")).toBeNull()
  })
})

describe("ModelPicker's Open weights link", () => {
  it("makes the whole badge the link, outside the option, so a click on it never chooses the row, and a click on the name does", () => {
    const onChoose = open(vi.fn(), ranked)
    const option = screen.getByRole("option", { name: "Model 4" })
    const weights = within(rowElementOf("Model 4")).getByRole("link", {
      name: "Open weights",
    })
    expect(weights.getAttribute("href")).toBe(openBadge.href)
    expect(weights.getAttribute("target")).toBe("_blank")
    expect(weights.getAttribute("rel")).toBe("noopener noreferrer")
    expect(
      weights.querySelector("[data-slot='hugging-face-mark']")
    ).not.toBeNull()
    expect(option.contains(weights)).toBe(false)
    expect(weights.closest("[role='option']")).toBeNull()
    fireEvent.click(weights)
    expect(onChoose).not.toHaveBeenCalled()
    fireEvent.click(option)
    expect(onChoose).toHaveBeenCalledWith("maker/model-4")
  })
})

describe("ModelPicker's rank", () => {
  it("sits on the mark's top right corner, outside the tile, so the mark and the text start where a row with no rank puts them", () => {
    open(vi.fn(), ranked)
    const row = rowElementOf("Model 4")
    const rank = row.querySelector<HTMLElement>("[data-slot='model-row-rank']")
    const tile = row.querySelector("[data-slot='model-row-mark']")
    expect(rank?.textContent).toBe("3")
    expect(rank?.getAttribute("aria-label")).toBe("#3")
    expect(rank?.parentElement).toBe(tile?.parentElement)
    expect(tile?.contains(rank ?? null)).toBe(false)
    expect(rank?.className.split(" ")).toEqual(
      expect.arrayContaining(["absolute", "-top-1.5", "-end-1.5"])
    )
    const plain = rowElementOf("Model 5")
    expect(plain.querySelector("[data-slot='model-row-rank']")).toBeNull()
    expect(plain.querySelector("[data-slot='model-row-mark']")?.className).toBe(
      tile?.className
    )
  })

  it("is gold for #1, silver for #2, bronze for #3 and quiet after, from the existing tokens", () => {
    const tones = [1, 2, 3, 4, 12].map((place) => {
      const { container } = render(
        <ModelRow
          row={rowOf("a/one", {
            rank: { place, label: `#${place}` },
          })}
          isChosen={false}
          isPricing={false}
          onChoose={() => undefined}
        />
      )
      const rank = container.querySelector("[data-slot='model-row-rank']")
      const face = rank?.firstElementChild?.className.split(" ") ?? []
      cleanup()
      return {
        tone: rank?.getAttribute("data-tone"),
        face: face.filter(
          (name) => /^(bg|text)-/.test(name) && name !== "text-legal"
        ),
      }
    })
    expect(tones).toEqual([
      { tone: "gold", face: ["bg-cem-tint", "text-cem-text"] },
      { tone: "silver", face: ["bg-(--tint)", "text-ink"] },
      { tone: "bronze", face: ["bg-(--tint)", "text-cem-text"] },
      { tone: "quiet", face: ["bg-(--tint)", "text-ink-muted"] },
      { tone: "quiet", face: ["bg-(--tint)", "text-ink-muted"] },
    ])
    expect([1, 2, 3, 4].map(rankToneOf)).toEqual([
      "gold",
      "silver",
      "bronze",
      "quiet",
    ])
  })

  it("chooses the row when you press its rank", () => {
    const onChoose = open(vi.fn(), ranked)
    const rank = rowElementOf("Model 4").querySelector(
      "[data-slot='model-row-rank']"
    )
    if (rank === null) {
      throw new Error("no rank")
    }
    fireEvent.click(rank)
    expect(onChoose).toHaveBeenCalledWith("maker/model-4")
  })

  it("names the boards and the date in a note on hover and on focus, and takes the keyboard after the option", async () => {
    open(vi.fn(), ranked)
    const rank = rowElementOf("Model 4").querySelector<HTMLElement>(
      "[data-slot='model-row-rank']"
    )
    if (rank === null) {
      throw new Error("no rank")
    }
    expect(rank.className.split(" ")).toContain("pointer-events-auto")
    expect(rank.tabIndex).toBe(0)
    fireEvent.focus(rank)
    expect(await screen.findByText("Rank from Picture Arena")).toBeTruthy()
  })
})

describe("ModelPicker's rows and motion", () => {
  it("sets each row's 33 px mark tile on its ground's well and the check muted at the end", () => {
    open()
    const tile = rowElementOf("Clip 3").querySelector(
      "[data-slot='model-row-mark']"
    )
    expect(tile?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "size-icon-dense",
        "bg-(--well)",
        "[&_svg]:glyph-small",
      ])
    )
    expect(
      rowElementOf("Picture 2").querySelector("[data-slot='model-row-check']")
        ?.className
    ).toContain("text-ink-muted")
  })

  it("opens on the popover preset over the same material as every menu", () => {
    open()
    const list = document.querySelector("[data-slot='model-picker']")
    const classes = list?.className.split(" ") ?? []
    expect(classes).toEqual(
      expect.arrayContaining(["motion-popover", "material"])
    )
    expect(list?.getAttribute("data-material")).toBe("regular")
  })
})

describe("ModelRow's price slot", () => {
  it("holds a skeleton while pending, the figure after the coin when known, and nothing when no price exists, at one height", () => {
    const row = rowOf("a/one")
    const heights: string[] = []
    const states: (string | null | undefined)[] = []
    for (const [price, isPricing] of [
      [undefined, true],
      [{ amount: "6.5", name: "6.5 credits", credits: 6.5 }, false],
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
      if (price !== undefined) {
        const figure = slot?.querySelector("[data-slot='credit-price']")
        expect(figure?.textContent).toBe("6.5")
      } else if (!isPricing) {
        expect(slot?.childElementCount).toBe(0)
      }
      cleanup()
    }
    expect(states).toEqual(["pending", "known", "none"])
    expect(new Set(heights).size).toBe(1)
    expect(heights[0]).toContain("h-13")
  })
})
