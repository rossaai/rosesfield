import { describe, expect, it } from "vitest"
import {
  boardRankOf,
  factsOf,
  labOfModel,
  lineKeyOf,
  type ModelFactsFile,
  modelFactsData,
  modelFactsFile,
  weightsHost,
} from "#comfy/model-facts"

const markSet = {
  name: "Simple Icons",
  version: "16.35.0",
  licence: "CC0-1.0",
  url: "https://icons.example/set",
}

const noLine = { none: "No page read holds a description" }

const sample: ModelFactsFile = modelFactsFile.parse({
  markSet,
  marks: {},
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
    },
    "maker/elsewhere": {
      lab: "Maker Lab",
      release: null,
      weights: "https://github.com/maker/elsewhere",
      ranks: {},
      thirds: {},
      line: noLine,
    },
  },
})

const markedServices: readonly string[] = ["Comfy", "Hugging Face"]

describe("the model facts the catalog holds", () => {
  it("gives a model its lab, its release, its rank with the board and the date, its price third and its weights page", () => {
    expect(factsOf("maker/open", "text-to-image", sample)).toEqual({
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
      lineKey: "comfy.model.makerOpen.line",
    })
  })

  it("leaves each fact it does not hold empty, and keeps a weights page off Hugging Face out", () => {
    expect(factsOf("maker/open", "image-edit", sample)).toMatchObject({
      rank: null,
      priceThird: null,
    })
    expect(factsOf("maker/elsewhere", "text-to-image", sample)).toEqual({
      lab: "Maker Lab",
      release: null,
      rank: null,
      priceThird: null,
      weights: null,
      lineKey: null,
    })
    expect(factsOf("maker/unknown", "text-to-image", sample)).toEqual({
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
      factsOf("graph/ming-image-0-1-design", "text-to-image")
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
      line: noLine,
    }
    const pricey = { ...row, ranks: {}, thirds: { "text-to-image": 4 } }
    for (const one of [row, pricey]) {
      expect(
        modelFactsFile.safeParse({
          boards: {},
          markSet,
          marks: {},
          models: { "a/b": one },
        }).success
      ).toBe(false)
    }
    expect(
      modelFactsFile.safeParse({
        boards: {},
        markSet,
        marks: {},
        models: { "a/b": { ...row, ranks: {} } },
      }).success
    ).toBe(true)
  })

  it("reads a model's line through the key its own row holds, and gives a row that holds none no line", () => {
    expect(factsOf("maker/open", "text-to-image", sample).lineKey).toBe(
      "comfy.model.makerOpen.line"
    )
    expect(
      factsOf("maker/elsewhere", "text-to-image", sample).lineKey
    ).toBeNull()
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
    expect(factsOf("graph/z-image-turbo", "text-to-image").lineKey).toBe(
      "comfy.model.graphZImageTurbo.line"
    )
    expect(factsOf("openai/gpt-image-2", "text-to-image").lineKey).toBeNull()
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
        modelFactsFile.safeParse({
          boards: {},
          markSet,
          marks: {},
          models: { "a/b": row },
        }).success
      ).toBe(false)
    }
  })

  it("draws each lab's mark from one public icon set as path data, for labs a model row names and the two services a screen marks", () => {
    expect(modelFactsData.markSet).toMatchObject({
      name: "Simple Icons",
      licence: "CC0-1.0",
    })
    const labs = new Set(
      Object.values(modelFactsData.models).map((row) => row.lab)
    )
    const marked = Object.keys(modelFactsData.marks)
    expect(marked.length).toBeGreaterThan(5)
    expect(
      marked.filter((lab) => !(labs.has(lab) || markedServices.includes(lab)))
    ).toEqual([])
    expect(modelFactsData.marks.Google?.slug).toBe("google")
    expect(Object.hasOwn(modelFactsData.marks, "Black Forest Labs")).toBe(false)
  })

  it("takes a mark the icon set lacks from its owner's own published file, and names that file", () => {
    expect(modelFactsData.marks.Comfy).toMatchObject({
      slug: "comfy",
      hex: "F2FF59",
      source: "https://comfy.org/icons/logomark.svg",
    })
    expect(
      Object.entries(modelFactsData.marks)
        .filter(([, mark]) => mark.source !== undefined)
        .map(([name]) => name)
    ).toEqual(["Comfy"])
    expect(modelFactsData.marks["Hugging Face"]?.hex).toBe("FFD21E")
  })

  it("colours each lab's mark with the hex its icon set publishes beside it", () => {
    expect(modelFactsData.marks.Google?.hex).toBe("4285F4")
    expect(modelFactsData.marks.MiniMax?.hex).toBe("E73562")
    expect(modelFactsData.marks.DeepSeek?.hex).toBe("5786FE")
  })

  it("names one lab for each maker, so a picker groups a maker's models once", () => {
    const labs = new Set(
      Object.values(modelFactsData.models).map((row) => row.lab)
    )
    for (const split of [
      "KlingAI",
      "Fal",
      "Luma Labs",
      "Pruna AI",
      "SpaceXAI",
    ]) {
      expect(labs.has(split), split).toBe(false)
    }
    expect(labOfModel("kling/kling-v3")).toBe("Kling")
    expect(labOfModel("xai/grok-imagine-video")).toBe("xAI")
    expect(labOfModel("qwen/qwen-image-3.0")).toBe("Alibaba Qwen")
  })

  it("names the lab of each chat model the agent runs, and none for a model it does not hold", () => {
    expect(labOfModel("deepseek/deepseek-v4-flash")).toBe("DeepSeek")
    expect(labOfModel("z-ai/glm-4.6")).toBe("Z.ai")
    expect(labOfModel("anthropic/claude-sonnet-5")).toBe("Anthropic")
    expect(labOfModel("maker/unknown")).toBeNull()
    expect(labOfModel("toString")).toBeNull()
  })

  it("refuses a mark that is markup or a picture rather than path data, the control", () => {
    const mark = {
      slug: "maker",
      title: "Maker",
      hex: "4285F4",
      path: "M0 0h24v24H0z",
    }
    const marks = [
      { ...mark, path: "<image href='maker.png'/>" },
      { ...mark, path: 'M0 0h24v24H0z"/><script>' },
      { ...mark, slug: "Maker Lab" },
      { ...mark, hex: "#4285F4" },
      { ...mark, hex: "blue" },
      { slug: "maker", title: "Maker", path: "M0 0h24v24H0z" },
    ]
    for (const mark of marks) {
      expect(
        modelFactsFile.safeParse({
          boards: {},
          markSet,
          marks: { "Maker Lab": mark },
          models: {},
        }).success
      ).toBe(false)
    }
    expect(
      modelFactsFile.safeParse({
        boards: {},
        markSet,
        marks: { "Maker Lab": mark },
        models: {},
      }).success
    ).toBe(true)
  })
})
