import type {
  CatalogModel,
  ModelFacts,
  TaskScore,
} from "@rosesfield/catalog/comfy"
import { type Run, run } from "@rosesfield/contract"
import { isValidElement } from "react"
import { describe, expect, it } from "vitest"
import { pickerSections } from "@/screens/app/hosted/catalog-picker"
import {
  defaultIdOf,
  mainTaskOf,
  recentModelsOf,
  taskBoardsOf,
  topOrderOf,
} from "@/screens/app/hosted/model-sections"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"

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

function hostedOf(models: readonly CatalogModel[]): HostedState {
  return {
    isTaskApp: true,
    models,
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: null,
    chosen: null,
    fields: null,
    choose: () => undefined,
  }
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

function runOf(createdAt: string, model: string | number | undefined): Run {
  return run.parse({
    id: "7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4a03",
    appId: "image",
    status: "done",
    inputs: model === undefined ? {} : { model, prompt: "a fox" },
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter: "comfy-router", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt,
    finishedAt: null,
  })
}

describe("the models of your recent runs", () => {
  it("lists each model your runs used once, newest run first, and skips a run with no model", () => {
    const runs = [
      runOf("2026-10-20T10:00:00.000Z", "lab/old"),
      runOf("2026-10-26T10:00:00.000Z", "lab/new"),
      runOf("2026-10-25T10:00:00.000Z", "lab/old"),
      runOf("2026-10-26T11:00:00.000Z", undefined),
      runOf("2026-10-24T10:00:00.000Z", 3),
    ]
    expect(recentModelsOf(runs)).toEqual(["lab/new", "lab/old"])
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

  it("lists every model once in one list, an image row with its proven fact and a video row with its own facts, the hosting fact last", () => {
    const sections = pickerSections(hostedOf(models))
    expect(sections.map((section) => section.id)).toEqual(["all"])
    const rows = sections.flatMap((section) => section.rows)
    expect(rows.map((row) => row.id)).toEqual([
      "open-picture",
      "alpha/one",
      "beta/two",
      "beta/three",
    ])
    const image = rows.find((row) => row.id === "alpha/one")
    const video = rows.find((row) => row.id === "beta/three")
    const graph = rows.find((row) => row.id === "open-picture")
    expect(image?.tags.map((tag) => tag.label)).toEqual([
      "Ran in Rosesfield",
      "Hosted by the maker",
    ])
    expect(video?.tags.map((tag) => tag.label)).toEqual([
      "From text",
      "1080p",
      "5 to 10 s",
      "Hosted by the maker",
    ])
    expect(graph?.badges).toEqual([
      { kind: "openWeights", label: "Open weights", markColour: "#FFD21E" },
    ])
    expect(graph?.isOpen).toBe(true)
    expect(image?.badges).toEqual([])
    expect(rows.map((row) => row.lab)).toContain("Alpha")
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
    const [row] = pickerSections(hostedOf([ming]), "2026-10-26").flatMap(
      (section) => section.rows
    )
    expect(row?.maker).toBe("inclusionAI")
    const mark = row?.mark
    expect(
      isValidElement<{ maker: string }>(mark) ? mark.props.maker : null
    ).toBe("inclusionAI")
    expect(row?.released).toBe("2026-10-22")
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

  it("gives each priced row its price and its figure for the Price order, and an unpriced row neither", () => {
    const price = { amount: "6", name: "6 Comfy credits" }
    const rows = pickerSections(
      hostedOf(models),
      "2026-10-20",
      new Map([["alpha/one", price]])
    ).flatMap((section) => section.rows)
    const alpha = rows.find((row) => row.id === "alpha/one")
    expect(alpha?.price).toEqual(price)
    expect(alpha?.cost).toBe(6)
    const beta = rows.find((row) => row.id === "beta/two")
    expect(beta).not.toHaveProperty("price")
    expect(beta).not.toHaveProperty("cost")
  })
})
