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
        tags: [],
      },
    ],
  },
]

function open(onChoose = vi.fn()) {
  render(
    <ModelPicker
      trigger={<Chip>Picture 2</Chip>}
      title="Model"
      searchLabel="Search models"
      searchPlaceholder="Search by name or maker"
      emptyLabel="No model matches"
      sections={sections}
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
      .map((group) => group.querySelector("legend")?.textContent)
    expect(groups).toEqual(["Your models", "Studio"])
    const chosen = screen.getByRole("option", { selected: true })
    expect(chosen.textContent).toContain("Picture 2")
    expect(chosen.querySelector("svg")).not.toBeNull()
    expect(screen.getAllByRole("option", { selected: false })).toHaveLength(2)
  })

  it("shows the factual tags of a row in the neutral tone", () => {
    open()
    const clip = screen.getByRole("option", { name: /Clip 3/ })
    const tags = within(clip).getAllByText(/1080p|5 to 10 s/)
    expect(tags).toHaveLength(2)
    for (const tag of tags) {
      expect(tag.className).toContain("text-ink-muted")
      expect(tag.className).not.toMatch(/bug|cem|hor|nop/)
    }
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
    fireEvent.click(screen.getByRole("option", { name: /Sketch 1/ }))
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
