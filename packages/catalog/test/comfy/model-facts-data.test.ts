import { describe, expect, it } from "vitest"
import {
  factsOf,
  lineKeyOf,
  type ModelFactsFile,
  modelFactsData,
  modelFactsFile,
  scoresOf,
  weightsHost,
} from "#comfy/model-facts"

const markSet = [
  {
    name: "Simple Icons",
    version: "16.35.0",
    licence: "CC0-1.0",
    url: "https://icons.example/set",
  },
]

const noLine = { none: "No page read holds a description" }

const arena = {
  board: "Picture Arena",
  url: "https://boards.example/pictures",
  readOn: "2026-10-20",
  published: "2026-10-07",
  row: "open-1",
  position: 2,
  size: 10,
  positionScore: 88.89,
  display: true,
  rating: 1300.5,
  licence: "CC BY 4.0",
  site: "https://boards.example",
}

const scoredCell = {
  score: 89,
  licensedScore: 89,
  rank: 1,
  of: 3,
  placement: "score",
  sources: [arena],
  tiers: ["best quality", "best value"],
  price: { credits: 4.22, unit: "per output" },
}

const tailCell = {
  score: null,
  licensedScore: null,
  rank: 2,
  of: 3,
  placement: "release",
  sources: [],
  tiers: ["cheapest"],
  price: { none: "the rate card does not price it" },
}

const scoreMethod = "Each board's position, averaged over the boards."

const sampleFile = {
  scoreMethod,
  markSet,
  marks: {},
  marksMissing: {},
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
      line: {
        key: "comfy.model.makerOpen.line",
        source: "https://huggingface.co/maker/open/blob/abc/README.md",
        quote: "Makes pictures of open things.",
      },
      releaseSource: { url: "https://maker.example/open", kind: "maker page" },
      tasks: { "text-to-image": scoredCell },
    },
    "maker/elsewhere": {
      lab: "Maker Lab",
      release: null,
      weights: "https://github.com/maker/elsewhere",
      ranks: {},
      thirds: {},
      line: noLine,
      releaseSource: { none: "no page names its release" },
      tasks: { "text-to-image": tailCell },
    },
    "maker/last": {
      lab: "Maker Lab",
      release: null,
      weights: null,
      ranks: {},
      thirds: {},
      line: noLine,
      tasks: {
        "text-to-image": { ...tailCell, rank: 3, placement: "unplaced" },
      },
    },
  },
}

const sample: ModelFactsFile = modelFactsFile.parse(sampleFile)

const withCell = (cell: Record<string, unknown>) => ({
  ...sampleFile,
  models: {
    ...sampleFile.models,
    "maker/open": {
      ...sampleFile.models["maker/open"],
      tasks: { "text-to-image": { ...scoredCell, ...cell } },
    },
  },
})

const emptyFile = {
  scoreMethod,
  boards: {},
  markSet,
  marks: {},
  marksMissing: {},
}

describe("the model facts the catalog holds", () => {
  it("gives a model its lab, its release, its weights page, and per task its score, its rank, the boards with their dates and its tiers", () => {
    expect(factsOf("maker/open", sample)).toEqual({
      lab: "Maker Lab",
      release: "2026-10-01",
      weights: "https://huggingface.co/maker/open",
      lineKey: "comfy.model.makerOpen.line",
      scores: {
        "text-to-image": {
          score: 89,
          rank: 1,
          order: 1,
          of: 3,
          sources: [
            {
              board: "Picture Arena",
              url: "https://boards.example/pictures",
              readOn: "2026-10-20",
              display: "allowed",
            },
          ],
          tiers: ["bestQuality"],
        },
      },
    })
  })

  it("gives a model placed after every scored one its place in the order and no rank, and leaves each fact it does not hold empty", () => {
    expect(scoresOf("maker/elsewhere", sample)).toEqual({
      "text-to-image": {
        score: null,
        rank: null,
        order: 2,
        of: 3,
        sources: [],
        tiers: ["cheapest"],
      },
    })
    expect(factsOf("maker/elsewhere", sample)).toMatchObject({
      lab: "Maker Lab",
      release: null,
      weights: null,
      lineKey: null,
    })
    expect(factsOf("maker/unknown", sample)).toEqual({
      lab: null,
      release: null,
      weights: null,
      lineKey: null,
      scores: {},
    })
    expect(scoresOf("toString", sample)).toEqual({})
  })

  it("reads the landed table whole: a score from 0 to 100, ranks once each from 1 to the task's count, and a board with its date for every score", () => {
    const cells = Object.keys(modelFactsData.models).flatMap((id) =>
      Object.entries(scoresOf(id)).map(([task, cell]) => ({ id, task, cell }))
    )
    expect(cells).toHaveLength(329)
    for (const { id, task, cell } of cells) {
      expect(cell.order <= cell.of, `${id} ${task}`).toBe(true)
      expect(cell.score === null || cell.sources.length > 0, id).toBe(true)
      for (const one of cell.sources) {
        expect(one.readOn, `${id} ${task}`).toBe("2026-10-26")
      }
    }
    expect(modelFactsData.scoreMethod).toContain("100 * (N - p) / (N - 1)")
  })

  it("orders Image by the score, with GPT Image 2.5 Sunburst first and Z-Image Turbo at 39 of 66", () => {
    const image = Object.keys(modelFactsData.models)
      .flatMap((id) => {
        const cell = scoresOf(id)["text-to-image"]
        return cell === undefined ? [] : [{ id, cell }]
      })
      .sort((a, b) => a.cell.order - b.cell.order)
    expect(image.slice(0, 5).map((one) => one.id)).toEqual([
      "openai/gpt-image-2.5-sunburst",
      "openai/gpt-image-2.5-flare",
      "openai/gpt-image-2",
      "xai/grok-imagine-image-2.0",
      "vertexai/gemini-nano-banana-2.1",
    ])
    expect(image[0]?.cell.tiers).toEqual(["bestQuality"])
    expect(scoresOf("graph/z-image-turbo")["text-to-image"]).toMatchObject({
      score: 30,
      rank: 39,
      of: 66,
    })
  })

  it("puts the newest Meshy first on 3D and gives it Best quality by its rank, while the scores stay the board's", () => {
    const order = [
      "graph/meshy-7-1-image",
      "meshy/meshy-7.1",
      "meshy/meshy-7",
      "meshy/meshy-6",
    ]
    const cells = order.map((id) => scoresOf(id)["three-d"])
    expect(cells.map((cell) => cell?.rank)).toEqual([1, 2, 3, 4])
    expect(cells.map((cell) => cell?.score)).toEqual([null, null, 83, 91])
    expect(cells[0]?.tiers).toEqual(["bestQuality"])
    expect(cells[3]?.tiers).toEqual([])
  })

  it("names the release date of a model where it was read", () => {
    expect(factsOf("meshy/meshy-7.1").release).toBe("2026-09-10")
    expect(
      modelFactsData.models["meshy/meshy-7.1"]?.releaseSource
    ).toMatchObject({
      kind: "maker page",
    })
  })

  it("keeps Ming Image 0.1 Design by inclusionAI with its weights page, a row the picker no longer lists and no task scores", () => {
    expect(factsOf("graph/ming-image-0-1-design")).toEqual({
      lab: "inclusionAI",
      release: "2026-09-22",
      weights: "https://huggingface.co/inclusionAI/Ming-Image-0.1-Design",
      lineKey: "comfy.model.graphMingImage01Design.line",
      scores: {},
    })
  })

  it("links every weights page it holds on Hugging Face", () => {
    const pages = Object.values(modelFactsData.models).flatMap((row) =>
      row.weights === null ? [] : [row.weights]
    )
    expect(pages.length).toBeGreaterThan(5)
    expect(pages.filter((page) => !page.startsWith(weightsHost))).toEqual([])
  })

  it("refuses a malformed score cell, the control", () => {
    expect(modelFactsFile.safeParse(sampleFile).success).toBe(true)
    const malformed = [
      { rank: 4 },
      { rank: 2 },
      { score: 101 },
      { score: 89.5 },
      { sources: [] },
      { score: null },
      { placement: "release" },
      { tiers: ["premium"] },
      { sources: [{ ...arena, licence: undefined }] },
      { sources: [{ ...arena, display: false }] },
      { sources: [{ ...arena, position: 11 }] },
      { price: { credits: 4, unit: "per token" } },
      { extra: 1 },
    ]
    for (const cell of malformed) {
      expect(
        modelFactsFile.safeParse(withCell(cell)).success,
        JSON.stringify(cell)
      ).toBe(false)
    }
  })

  it("refuses a table with no score method, a release with no source and a rank that is not a whole number, the control", () => {
    const { scoreMethod: _method, ...unexplained } = sampleFile
    expect(modelFactsFile.safeParse(unexplained).success).toBe(false)
    const open = sampleFile.models["maker/open"]
    const unsourced = {
      ...sampleFile,
      models: {
        ...sampleFile.models,
        "maker/open": { ...open, releaseSource: { none: "no page" } },
      },
    }
    expect(modelFactsFile.safeParse(unsourced).success).toBe(false)
    const halfRank = {
      ...sampleFile,
      models: {
        ...sampleFile.models,
        "maker/open": { ...open, ranks: { "text-to-image": 2.5 } },
      },
    }
    expect(modelFactsFile.safeParse(halfRank).success).toBe(false)
  })

  it("reads a model's line through the key its own row holds, and gives a row that holds none no line", () => {
    expect(factsOf("maker/open", sample).lineKey).toBe(
      "comfy.model.makerOpen.line"
    )
    expect(factsOf("maker/elsewhere", sample).lineKey).toBeNull()
  })

  it("reads a model's line key with no task, and none for a row with no line or no row, the control", () => {
    expect(lineKeyOf("maker/open", sample)).toBe("comfy.model.makerOpen.line")
    expect(lineKeyOf("maker/elsewhere", sample)).toBeNull()
    expect(lineKeyOf("maker/unknown", sample)).toBeNull()
    expect(lineKeyOf("graph/z-image-turbo")).toBe(
      "comfy.model.graphZImageTurbo.line"
    )
    expect(lineKeyOf("graph/qwen-image-edit-2511")).toBe(
      "comfy.model.graphQwenImageEdit2511.line"
    )
  })

  it("gives every model row a line with its source and the words it restates, or the reason it holds none", () => {
    const rows = Object.entries(modelFactsData.models)
    const described = rows.flatMap(([id, row]) =>
      "key" in row.line ? [{ id, ...row.line }] : []
    )
    const undescribed = rows.filter(([, row]) => "none" in row.line)
    expect(described.length + undescribed.length).toBe(rows.length)
    expect(described.length).toBeGreaterThan(5)
    const keys = described.map((line) => line.key)
    expect(new Set(keys).size).toBe(keys.length)
    const sources = [
      "https://huggingface.co/",
      "https://github.com/Comfy-Org/workflow_templates/blob/46e060ea88eb07adecf07197ec384c54a70e030c/templates/index.json#",
      "https://docs.bfl.ml/",
    ]
    for (const line of described) {
      expect(
        sources.some((start) => line.source.startsWith(start)),
        line.id
      ).toBe(true)
    }
    expect(factsOf("graph/z-image-turbo").lineKey).toBe(
      "comfy.model.graphZImageTurbo.line"
    )
    expect(factsOf("openai/gpt-image-2").lineKey).toBeNull()
  })

  it("refuses a line with no source, a row with no line and a key outside the catalog's line keys, the control", () => {
    const base = {
      lab: "Maker Lab",
      release: null,
      weights: null,
      ranks: {},
      thirds: {},
    }
    const lines = [
      undefined,
      { key: "comfy.model.makerOpen.line", quote: "Makes pictures." },
      {
        key: "model.makerOpen",
        source: "https://huggingface.co/maker/open",
        quote: "Makes pictures.",
      },
      { none: "" },
    ]
    for (const line of lines) {
      const row = line === undefined ? base : { ...base, line }
      expect(
        modelFactsFile.safeParse({ ...emptyFile, models: { "a/b": row } })
          .success
      ).toBe(false)
    }
  })
})
