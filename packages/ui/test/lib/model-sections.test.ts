import type { ModelPickerRow } from "@rosesfield/ui/components/model-row"
import { valueRowsOf, wholeCreditsOf } from "@rosesfield/ui/lib/model-sections"
import { describe, expect, it } from "vitest"

function rowOf(id: string, place?: number, credits?: number): ModelPickerRow {
  return {
    id,
    name: id,
    keywords: [],
    badges: [],
    capabilities: [],
    ...(place === undefined ? {} : { rank: { place, label: `#${place}` } }),
    ...(credits === undefined
      ? {}
      : { price: { amount: String(credits), name: "", credits } }),
  }
}

const agentLine = [
  ["anthropic/claude-opus-5.5", 1, 28.86],
  ["anthropic/claude-fable-5.1", 4, 71.45],
  ["google/gemini-4-argon", 3, 14.49],
  ["moonshotai/kimi-k3.1-pro", 2, 17.26],
  ["anthropic/claude-sonnet-5.5", 9, 14.43],
  ["meta/muse-spark-1.3", 8, 7.3],
  ["openai/gpt-6.1-terra", 10, 4.6],
  ["google/gemini-3.8-flash", 19, 5.98],
  ["deepseek/deepseek-v4.1-flash-1017", 16, 1.71],
  ["xiaomi/mimo-v2.6-pro", 21, 1.25],
  ["z-ai/glm-5.3-flash", 26, 0.92],
  ["inclusionai/ling-3.1-flash", 29, 0.22],
] as const

describe("the price a row is compared at", () => {
  it("rounds up to a whole credit and never under 1, as every price reads", () => {
    expect([0.04, 0.92, 1, 1.2, 1.71, 28.86].map(wholeCreditsOf)).toEqual([
      1, 1, 1, 2, 2, 29,
    ])
    expect(wholeCreditsOf(0.1 + 0.2 + 11.7)).toBe(12)
  })
})

describe("the Best value rows", () => {
  it("is the Pareto line of rank against whole credits, best first, each cheaper than every row ranked above it", () => {
    const rows = [
      ...agentLine.map(([id, place, credits]) => rowOf(id, place, credits)),
      ...Array.from({ length: 108 }, (_, index) =>
        rowOf(`tail/${index}`, 30 + index, 0.05)
      ),
    ]
    expect(valueRowsOf(rows).map((row) => row.id)).toEqual([
      "anthropic/claude-opus-5.5",
      "moonshotai/kimi-k3.1-pro",
      "google/gemini-4-argon",
      "meta/muse-spark-1.3",
      "openai/gpt-6.1-terra",
      "deepseek/deepseek-v4.1-flash-1017",
      "z-ai/glm-5.3-flash",
    ])
  })

  it("leaves out every row below the top quarter of the ranked rows, however cheap", () => {
    const rows = Array.from({ length: 8 }, (_, index) =>
      rowOf(`m${index + 1}`, index + 1, 10 - index)
    )
    expect(valueRowsOf(rows).map((row) => row.id)).toEqual(["m1", "m2"])
  })

  it("leaves out an unranked or unpriced row", () => {
    const rows = [
      rowOf("ranked", 1, 9),
      rowOf("unpriced", 2),
      rowOf("unranked", undefined, 0.5),
      rowOf("r3", 3),
      rowOf("r4", 4),
    ]
    expect(valueRowsOf(rows).map((row) => row.id)).toEqual(["ranked"])
  })

  it("control: a line that kept the cheapest row whatever its rank would hold the bottom row", () => {
    const rows = Array.from({ length: 8 }, (_, index) =>
      rowOf(`m${index + 1}`, index + 1, 10 - index)
    )
    const unfloored = rows.filter((row, index) =>
      rows
        .slice(0, index)
        .every(
          (above) => (above.price?.credits ?? 0) > (row.price?.credits ?? 0)
        )
    )
    expect(unfloored.map((row) => row.id)).toContain("m8")
    expect(valueRowsOf(rows).map((row) => row.id)).not.toContain("m8")
  })
})
