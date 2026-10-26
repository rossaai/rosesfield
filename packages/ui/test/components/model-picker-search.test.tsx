import { Chip } from "@rosesfield/ui/components/chip"
import {
  ModelPicker,
  type ModelPickerRow,
} from "@rosesfield/ui/components/model-picker"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

const largestApp = 95

const frameMs = 16

function rowAt(index: number): ModelPickerRow {
  return {
    id: `lab-${index % 12}/model-${index}`,
    name: `Model ${index} ${index % 3 === 0 ? "Turbo" : "Pro"}`,
    maker: `Lab ${index % 12}`,
    lab: `Lab ${index % 12}`,
    tags: [{ label: "1080p" }, { label: "5 to 10 s" }, { label: "Sound" }],
    mark: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M0 0h24v24H0z" />
      </svg>
    ),
    badges: [
      { kind: "rank", label: `#${index + 1}`, note: "Rank from A and B" },
      { kind: "new", label: "New" },
      {
        kind: "openWeights",
        label: "Open weights",
        href: `https://huggingface.co/lab/model-${index}`,
      },
    ],
    price: { amount: String(index + 1), name: `${index + 1} credits` },
    cost: index + 1,
    released: `2026-${String((index % 12) + 1).padStart(2, "0")}-01`,
    isOpen: index % 2 === 0,
  }
}

const rows = Array.from({ length: largestApp }, (_, index) => rowAt(index))

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? Number.POSITIVE_INFINITY
}

describe("ModelPicker's search", () => {
  it(`filters the ${largestApp} rows of the largest app within one frame, ${frameMs} ms, per key press`, () => {
    render(
      <ModelPicker
        trigger={<Chip>Model</Chip>}
        title="Model"
        searchLabel="Search models"
        searchPlaceholder="Search by name or maker"
        emptyLabel="No model matches"
        sections={[{ id: "all", label: "All", rows }]}
        chosen={rows[0]?.id ?? null}
        onChoose={() => undefined}
        open
      />
    )
    const search = screen.getByRole("searchbox", { name: "Search models" })
    expect(screen.getAllByRole("option")).toHaveLength(largestApp)
    const typed = [
      "t",
      "tu",
      "tur",
      "turb",
      "turbo",
      "turb",
      "tur",
      "tu",
      "t",
      "",
    ]
    const times = [...typed, ...typed].map((value) => {
      const start = performance.now()
      fireEvent.change(search, { target: { value } })
      return performance.now() - start
    })
    fireEvent.change(search, { target: { value: "turbo" } })
    expect(screen.getAllByRole("option")).toHaveLength(32)
    const took = median(times)
    console.info(
      `search over ${largestApp} rows: median ${took.toFixed(2)} ms, slowest ${Math.max(...times).toFixed(2)} ms`
    )
    expect(took).toBeLessThan(frameMs)
  })
})
