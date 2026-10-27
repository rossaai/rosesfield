import type {
  CatalogModel,
  ModelFacts,
  TaskScore,
} from "@rosesfield/catalog/comfy"
import { isValidElement } from "react"
import { describe, expect, it } from "vitest"
import { catalogRowsOf } from "@/screens/app/hosted/catalog-picker"
import {
  defaultIdOf,
  mainTaskOf,
  taskBoardsOf,
  topOrderOf,
} from "@/screens/app/hosted/model-sections"

function model(
  id: string,
  maker: string,
  change: Partial<CatalogModel> = {}
): CatalogModel {
  return {
    id,
    kind: "hosted",
    maker,
    name: id.split("/")[1] ?? id,
    nameKey: null,
    task: "text-to-image",
    tags: [{ kind: "hosted" }],
    form: [],
    ...change,
  }
}

const board = {
  board: "Picture Arena",
  url: "https://boards.example/pictures",
  readOn: "2026-10-26",
  display: "refused",
} as const

function scored(order: number, rank: number | null = order): TaskScore {
  return {
    score: rank === null ? null : 100 - order,
    rank,
    order,
    of: 10,
    sources: rank === null ? [] : [board],
    tiers: [],
  }
}

function factsWith(scores: Record<string, TaskScore>): ModelFacts {
  return { lab: "Lab", release: null, weights: null, lineKey: null, scores }
}

function ranked(
  id: string,
  scores: Record<string, TaskScore>,
  task = "text-to-image"
): CatalogModel {
  return model(id, "Lab", { task, facts: factsWith(scores) })
}

describe("the Top order of an app's models", () => {
  it("orders by the rank for the app's main task, then by the model's own task, then as listed", () => {
    const models = [
      model("plain/one", "Plain"),
      ranked("lab/third", { "text-to-image": scored(3) }),
      ranked("lab/edit", { "image-edit": scored(1) }, "image-edit"),
      ranked("lab/first", { "text-to-image": scored(1) }),
      ranked("lab/tail", { "text-to-image": scored(9, null) }),
      model("plain/two", "Plain"),
    ]
    expect(mainTaskOf(models)).toBe("text-to-image")
    expect(topOrderOf(models, "text-to-image").map((one) => one.id)).toEqual([
      "lab/first",
      "lab/third",
      "lab/tail",
      "lab/edit",
      "plain/one",
      "plain/two",
    ])
  })

  it("opens on the app's declared default when the picker lists it, and on the Top first otherwise", () => {
    const models = [
      ranked("lab/second", { "text-to-image": scored(2) }),
      ranked("lab/first", { "text-to-image": scored(1) }),
      ranked("lab/tail", { "text-to-image": scored(9, null) }),
    ]
    expect(defaultIdOf("lab/tail", models)).toBe("lab/tail")
    expect(defaultIdOf("gone/model", models)).toBe("lab/first")
    expect(defaultIdOf(null, models)).toBe("lab/first")
    expect(defaultIdOf("gone/model", [])).toBe("gone/model")
  })

  it("names each board of a task once, from every model that holds the task", () => {
    const second = { ...board, board: "Second Arena" }
    const models = [
      ranked("lab/a", {
        "text-to-image": { ...scored(1), sources: [board, second] },
      }),
      ranked("lab/b", { "text-to-image": scored(2) }),
      ranked("lab/c", { "image-edit": scored(1) }, "image-edit"),
    ]
    expect(
      taskBoardsOf(models, "text-to-image").map((one) => one.board)
    ).toEqual(["Picture Arena", "Second Arena"])
    expect(taskBoardsOf(models, null)).toEqual([])
  })
})

describe("the rows of the model picker", () => {
  const models = [
    model("open-picture", "comfy-cloud", {
      kind: "graph",
      tags: [{ kind: "open-weights" }],
      form: null,
    }),
    model("alpha/one", "Alpha", {
      tags: [{ kind: "hosted" }, { kind: "proven" }],
    }),
    model("beta/two", "Beta"),
    model("beta/three", "Beta", {
      task: "text-to-video",
      tags: [
        { kind: "hosted" },
        { kind: "resolution", value: "1080p" },
        { kind: "length", min: 5, max: 10 },
      ],
    }),
  ]

  it("lists every model once, an image row with no caption and a video row with what it can do, and no hosting or proven fact", () => {
    const rows = catalogRowsOf(models)
    expect(rows.map((row) => row.id)).toEqual([
      "open-picture",
      "alpha/one",
      "beta/two",
      "beta/three",
    ])
    const image = rows.find((row) => row.id === "alpha/one")
    const video = rows.find((row) => row.id === "beta/three")
    const graph = rows.find((row) => row.id === "open-picture")
    expect(image?.capabilities).toEqual([])
    expect(video?.capabilities.map((tag) => tag.label)).toEqual([
      "From text",
      "1080p",
      "5 to 10 s",
    ])
    expect(graph?.badges).toEqual([
      { kind: "openWeights", label: "Open weights", markColour: "#FFD21E" },
    ])
    expect(image?.badges).toEqual([])
    expect(image?.keywords).toContain("Alpha")
  })

  it("names an open-weights graph's lab as its maker and in its mark, and opens the weights page its facts name", () => {
    const ming = model("ming-image-0-1-design", "inclusionAI", {
      kind: "graph",
      tags: [{ kind: "open-weights" }],
      form: null,
      facts: {
        lab: "inclusionAI",
        release: "2026-10-22",
        weights: "https://huggingface.co/inclusionAI/Ming-Image-0.1-Design",
        lineKey: null,
        scores: {},
      },
    })
    const [row] = catalogRowsOf([ming], "2026-10-26")
    expect(row?.keywords).toContain("inclusionAI")
    const mark = row?.mark
    expect(
      isValidElement<{ maker: string }>(mark) ? mark.props.maker : null
    ).toBe("inclusionAI")
    expect(row?.badges).toEqual([
      { kind: "new", label: "New" },
      {
        kind: "openWeights",
        label: "Open weights",
        href: "https://huggingface.co/inclusionAI/Ming-Image-0.1-Design",
        markColour: "#FFD21E",
      },
    ])
  })

  it("gives each priced row its price with its credits for the Price orders, and an unpriced row none", () => {
    const price = { amount: "6", name: "6 Comfy credits", credits: 6 }
    const rows = catalogRowsOf(
      models,
      "2026-10-20",
      new Map([["alpha/one", price]])
    )
    const alpha = rows.find((row) => row.id === "alpha/one")
    expect(alpha?.price).toEqual(price)
    const beta = rows.find((row) => row.id === "beta/two")
    expect(beta).not.toHaveProperty("price")
  })
})
