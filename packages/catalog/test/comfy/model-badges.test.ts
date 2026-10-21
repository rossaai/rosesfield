import { describe, expect, it } from "vitest"
import { factBadgesOf, isNewRelease } from "#comfy/model-badges"
import type { ModelFacts } from "#comfy/model-catalog.contract"

const today = "2026-10-20"

function factsWith(change: Partial<ModelFacts>): ModelFacts {
  return {
    lab: "Maker Lab",
    release: null,
    rank: null,
    priceThird: null,
    weights: null,
    lineKey: null,
    ...change,
  }
}

function rankAt(position: number, size = 100) {
  return {
    position,
    size,
    board: "Picture Arena",
    url: "https://boards.example/pictures",
    readOn: today,
  }
}

const kindsOf = (facts: ModelFacts | undefined) =>
  factBadgesOf(facts, today).map((badge) => badge.kind)

describe("the badges a model's facts allow", () => {
  it("marks a model released in the last 30 days New, and not one released 30 days ago or later than today", () => {
    expect(isNewRelease("2026-09-21", today)).toBe(true)
    expect(isNewRelease("2026-09-20", today)).toBe(false)
    expect(isNewRelease("2026-10-21", today)).toBe(false)
    expect(kindsOf(factsWith({ release: "2026-10-19" }))).toEqual(["new"])
  })

  it("marks a model among the top 5 of its board Top, with the board and the date", () => {
    expect(factBadgesOf(factsWith({ rank: rankAt(5) }), today)).toEqual([
      { kind: "top", rank: rankAt(5) },
    ])
    expect(kindsOf(factsWith({ rank: rankAt(6) }))).toEqual([])
  })

  it("marks Premium only in the most expensive third with a rank in the board's top half", () => {
    expect(kindsOf(factsWith({ rank: rankAt(50), priceThird: 3 }))).toEqual([
      "premium",
    ])
    expect(kindsOf(factsWith({ rank: rankAt(51), priceThird: 3 }))).toEqual([])
    expect(kindsOf(factsWith({ rank: rankAt(10), priceThird: 2 }))).toEqual([])
    expect(kindsOf(factsWith({ priceThird: 3 }))).toEqual([])
  })

  it("gives Open weights the model's weights page", () => {
    expect(
      factBadgesOf(
        factsWith({ weights: "https://huggingface.co/maker/open" }),
        today
      )
    ).toEqual([
      { kind: "open-weights", href: "https://huggingface.co/maker/open" },
    ])
  })

  it("shows no badge whose fact is missing", () => {
    expect(kindsOf(undefined)).toEqual([])
    expect(kindsOf(factsWith({}))).toEqual([])
  })

  it("orders New, Top, Premium and Open weights when a model holds every fact", () => {
    expect(
      kindsOf(
        factsWith({
          release: "2026-10-10",
          rank: rankAt(1),
          priceThird: 3,
          weights: "https://huggingface.co/maker/open",
        })
      )
    ).toEqual(["new", "top", "premium", "open-weights"])
  })
})
