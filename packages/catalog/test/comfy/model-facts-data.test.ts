import { describe, expect, it } from "vitest"
import {
  boardRankOf,
  factsOf,
  type ModelFactsFile,
  modelFactsData,
  modelFactsFile,
  weightsHost,
} from "#comfy/model-facts"

const sample: ModelFactsFile = modelFactsFile.parse({
  boards: {
    "text-to-image": {
      name: "Picture Arena",
      url: "https://boards.example/pictures",
      size: 10,
      readOn: "2026-10-20",
    },
  },
  models: {
    "maker/open": {
      lab: "Maker Lab",
      release: "2026-10-01",
      weights: "https://huggingface.co/maker/open",
      ranks: { "text-to-image": 2 },
      thirds: { "text-to-image": 3 },
    },
    "maker/elsewhere": {
      lab: "Maker Lab",
      release: null,
      weights: "https://github.com/maker/elsewhere",
      ranks: {},
      thirds: {},
    },
  },
})

describe("the model facts the catalog holds", () => {
  it("gives a model its lab, its release, its rank with the board and the date, its price third and its weights page", () => {
    expect(factsOf("maker/open", "text-to-image", "a.line", sample)).toEqual({
      lab: "Maker Lab",
      release: "2026-10-01",
      rank: {
        position: 2,
        size: 10,
        board: "Picture Arena",
        url: "https://boards.example/pictures",
        readOn: "2026-10-20",
      },
      priceThird: 3,
      weights: "https://huggingface.co/maker/open",
      lineKey: "a.line",
    })
  })

  it("leaves each fact it does not hold empty, and keeps a weights page off Hugging Face out", () => {
    expect(factsOf("maker/open", "image-edit", null, sample)).toMatchObject({
      rank: null,
      priceThird: null,
    })
    expect(factsOf("maker/elsewhere", "text-to-image", null, sample)).toEqual({
      lab: "Maker Lab",
      release: null,
      rank: null,
      priceThird: null,
      weights: null,
      lineKey: null,
    })
    expect(factsOf("maker/unknown", "text-to-image", null, sample)).toEqual({
      lab: null,
      release: null,
      rank: null,
      priceThird: null,
      weights: null,
      lineKey: null,
    })
  })

  it("cites a board and the date it was read for every rank it holds, within the board's size", () => {
    const ranked = Object.entries(modelFactsData.models).flatMap(([id, row]) =>
      Object.keys(row.ranks).map((task) => ({ id, task }))
    )
    expect(ranked.length).toBeGreaterThan(50)
    for (const { id, task } of ranked) {
      const rank = boardRankOf(id, task)
      const within = rank !== null && rank.position <= rank.size
      expect(within, `${id} ${task}`).toBe(true)
      expect(rank?.readOn, `${id} ${task}`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("names Ming Image 0.1 Design by inclusionAI, 45 of 104 on the text to image board read on 2026-10-20, with its weights page", () => {
    expect(
      factsOf("graph/ming-image-0-1-design", "text-to-image", null)
    ).toMatchObject({
      lab: "inclusionAI",
      release: "2026-09-22",
      rank: {
        position: 45,
        size: 104,
        board: "Artificial Analysis Text to Image Arena",
        readOn: "2026-10-20",
      },
      weights: "https://huggingface.co/inclusionAI/Ming-Image-0.1-Design",
    })
  })

  it("links every weights page it holds on Hugging Face", () => {
    const pages = Object.values(modelFactsData.models).flatMap((row) =>
      row.weights === null ? [] : [row.weights]
    )
    expect(pages.length).toBeGreaterThan(5)
    expect(pages.filter((page) => !page.startsWith(weightsHost))).toEqual([])
  })

  it("refuses a rank that is not a whole number and a price third outside 1 to 3, the control", () => {
    const row = {
      lab: "Maker Lab",
      release: null,
      weights: null,
      ranks: { "text-to-image": 2.5 },
      thirds: {},
    }
    const pricey = { ...row, ranks: {}, thirds: { "text-to-image": 4 } }
    for (const one of [row, pricey]) {
      expect(
        modelFactsFile.safeParse({ boards: {}, models: { "a/b": one } }).success
      ).toBe(false)
    }
    expect(
      modelFactsFile.safeParse({
        boards: {},
        models: { "a/b": { ...row, ranks: {} } },
      }).success
    ).toBe(true)
  })
})
