import { Chip } from "@rosesfield/ui/components/chip"
import {
  ModelPicker,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
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
    id: "first",
    label: "Your models",
    rows: [
      {
        id: "maker/picture-2",
        name: "Picture 2",
        maker: "Maker",
        line: "Makes an image from words",
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
        line: null,
        tags: [{ label: "1080p" }, { label: "5 to 10 s" }],
      },
      {
        id: "studio/sketch-1",
        name: "Sketch 1",
        maker: "Studio",
        line: "Makes an image from words",
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
        line: "Best at faces",
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

  it("shows the factual tags of a row in the neutral tone", () => {
    open()
    const tags = within(rowOf("Clip 3")).getAllByText(/1080p|5 to 10 s/)
    expect(tags).toHaveLength(2)
    for (const tag of tags) {
      expect(tag.closest("[data-slot='model-row-line']")?.className).toContain(
        "text-ink-muted"
      )
      expect(tag.className).not.toMatch(/bug|cem|hor|nop/)
    }
  })

  it("shows a row's one line and its tags together", () => {
    open()
    const sketch = rowOf("Sketch 1")
    expect(within(sketch).getByText("Makes an image from words")).toBeTruthy()
    expect(within(sketch).getByText("Open weights")).toBeTruthy()
  })

  it("puts the badges after the name and links Open weights to its page", () => {
    open(vi.fn(), badged)
    const row = rowOf("Model 4")
    const badges = [...row.querySelectorAll("[data-slot='badge']")]
    expect(badges.map((badge) => badge.getAttribute("data-kind"))).toEqual([
      "new",
      "openWeights",
    ])
    const weights = within(row).getByRole("link", { name: "Open weights" })
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
  it("sits outside the option, so a click on it never chooses the row", () => {
    const onChoose = open(vi.fn(), badged)
    const option = screen.getByRole("option", { name: "Model 4" })
    const weights = within(rowOf("Model 4")).getByRole("link", {
      name: "Open weights",
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

describe("ModelPicker's rows and motion", () => {
  it("insets each row's tile 6 px and its check slot 12 px inside a 1 px edge", () => {
    open()
    const list = document.querySelector("[data-slot='model-picker']")
    expect(list?.className.split(" ")).toContain("p-px")
    const inner = rowOf("Clip 3").querySelector(
      "[data-slot='model-row-mark']"
    )?.parentElement
    expect(inner?.className.split(" ")).toEqual(
      expect.arrayContaining(["ps-1.5", "pe-3"])
    )
  })

  it("fades in while it rises 4 px, on the popover's timing and with no scale", () => {
    open()
    const list = document.querySelector("[data-slot='model-picker']")
    const classes = list?.className.split(" ") ?? []
    expect(classes).toEqual(
      expect.arrayContaining([
        "[transition:opacity_var(--popover-in-opacity),translate_var(--popover-in-transform)]",
        "data-starting-style:opacity-0",
        "data-starting-style:translate-y-1",
      ])
    )
    expect(classes).not.toContain("motion-popover")
  })
})
