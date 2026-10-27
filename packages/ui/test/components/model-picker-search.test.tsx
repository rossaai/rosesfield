import type { ModelPickerRow } from "@rosesfield/ui/components/model-picker"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { openPicker } from "./model-picker-fixture"

afterEach(cleanup)

const largestApp = 95

const frameMs = 16

function rowAt(index: number): ModelPickerRow {
  return {
    id: `lab-${index % 12}/model-${index}`,
    name: `Model ${index} ${index % 3 === 0 ? "Turbo" : "Pro"}`,
    keywords: [`Lab ${index % 12}`],
    capabilities: [
      { label: "1080p" },
      { label: "5 to 10 s" },
      { label: "Sound" },
    ],
    mark: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M0 0h24v24H0z" />
      </svg>
    ),
    rank: { place: index + 1, label: `#${index + 1}`, note: "Rank from A" },
    badges: [
      index === 1 || index === 2
        ? { kind: "value", label: "Best value" }
        : { kind: "new", label: "New" },
      {
        kind: "openWeights",
        label: "Open weights",
        href: `https://huggingface.co/lab/model-${index}`,
      },
    ],
    price: {
      amount: String(index + 1),
      name: `${index + 1} credits`,
      credits: index + 1,
    },
  }
}

const rows = Array.from({ length: largestApp }, (_, index) => rowAt(index))

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? Number.POSITIVE_INFINITY
}

describe("ModelPicker's search", () => {
  it(`filters the ${largestApp} rows of the largest app within one frame, ${frameMs} ms, per key press`, () => {
    openPicker({
      rows,
      chosen: rows[0]?.id ?? null,
    })
    const search = screen.getByRole("searchbox", { name: "Search models" })
    expect(screen.getAllByRole("option")).toHaveLength(largestApp + 3)
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
    expect(screen.getAllByRole("option")).toHaveLength(32 + 1)
    const took = median(times)
    console.info(
      `search over ${largestApp} rows: median ${took.toFixed(2)} ms, slowest ${Math.max(...times).toFixed(2)} ms`
    )
    expect(took).toBeLessThan(frameMs)
  })
})
