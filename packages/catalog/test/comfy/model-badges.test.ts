import { describe, expect, it } from "vitest"
import { factBadgesOf, isNewRelease, taskScoreOf } from "#comfy/model-badges"
import type { ModelFacts, TaskScore } from "#comfy/model-catalog.contract"

const today = "2026-10-20"

const task = "text-to-image"

const board = {
  board: "Picture Arena",
  url: "https://boards.example/pictures",
  readOn: today,
  display: "allowed",
} as const

function scoreWith(change: Partial<TaskScore>): TaskScore {
  return {
    score: 80,
    rank: 4,
    order: 4,
    of: 10,
    sources: [board],
    tiers: [],
    ...change,
  }
}

function factsWith(change: Partial<ModelFacts>): ModelFacts {
  return {
    lab: "Maker Lab",
    release: null,
    weights: null,
    lineKey: null,
    scores: {},
    ...change,
  }
}

const kindsOf = (facts: ModelFacts | undefined, on: string | null = task) =>
  factBadgesOf(facts, on, today).map((badge) => badge.kind)

describe("the badges a model's facts allow", () => {
  it("marks a model released in the last 30 days New, and not one released 30 days ago or later than today", () => {
    expect(isNewRelease("2026-09-21", today)).toBe(true)
    expect(isNewRelease("2026-09-20", today)).toBe(false)
    expect(isNewRelease("2026-10-21", today)).toBe(false)
    expect(kindsOf(factsWith({ release: "2026-10-19" }))).toEqual(["new"])
  })

  it("shows the rank the model holds for the task asked, with the boards it came from", () => {
    const facts = factsWith({ scores: { [task]: scoreWith({ rank: 4 }) } })
    expect(factBadgesOf(facts, task, today)).toEqual([
      { kind: "rank", rank: 4, sources: [board] },
    ])
    expect(kindsOf(facts, "image-edit")).toEqual([])
    expect(kindsOf(facts, null)).toEqual([])
  })

  it("shows no rank for a model placed after every scored one, the default's case", () => {
    const tail = scoreWith({ score: null, rank: null, order: 40, sources: [] })
    expect(kindsOf(factsWith({ scores: { [task]: tail } }))).toEqual([])
  })

  it("marks Best value only where the table names that tier for the task", () => {
    const value = scoreWith({ tiers: ["bestValue"] })
    const costly = scoreWith({ tiers: ["costly", "bestQuality"] })
    expect(kindsOf(factsWith({ scores: { [task]: value } }))).toEqual([
      "rank",
      "value",
    ])
    expect(kindsOf(factsWith({ scores: { [task]: costly } }))).toEqual(["rank"])
  })

  it("gives Open weights the model's weights page", () => {
    expect(
      factBadgesOf(
        factsWith({ weights: "https://huggingface.co/maker/open" }),
        task,
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

  it("orders the rank, New, Best value and Open weights when a model holds every fact", () => {
    expect(
      kindsOf(
        factsWith({
          release: "2026-10-10",
          scores: { [task]: scoreWith({ rank: 1, tiers: ["bestValue"] }) },
          weights: "https://huggingface.co/maker/open",
        })
      )
    ).toEqual(["rank", "new", "value", "open-weights"])
  })

  it("reads a task's score only from the model's own scores, not from a name an object inherits", () => {
    const facts = factsWith({ scores: { [task]: scoreWith({}) } })
    expect(taskScoreOf(facts, task)?.rank).toBe(4)
    expect(taskScoreOf(facts, "toString")).toBeNull()
    expect(taskScoreOf(undefined, task)).toBeNull()
  })
})
