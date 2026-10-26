import type { CatalogModel, ModelFacts } from "@rosesfield/catalog/comfy"
import { isValidElement } from "react"
import { describe, expect, it } from "vitest"
import { pickerSections } from "@/screens/app/hosted/catalog-picker"
import {
  modelSections,
  rankedModelsOf,
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

describe("the sections of the model picker", () => {
  it("puts the ranked models under Featured in their order, then every model under All, open weights first, for the picker to group by lab", () => {
    const sections = modelSections(
      models,
      ["beta/two", "alpha/one", "beta/two", "gone/model"],
      (one) => one.name
    )
    expect(
      sections.map((section) => [section.id, section.rows.map((row) => row.id)])
    ).toEqual([
      ["featured", ["beta/two", "alpha/one"]],
      ["all", ["open-picture", "alpha/one", "beta/two", "beta/three"]],
    ])
  })

  it("leaves Featured out when nothing is featured", () => {
    const sections = modelSections(models, [], (one) => one.name)
    expect(sections.map((section) => section.id)).toEqual(["all"])
  })

  it("gives an image row its proven fact and a video row its factual tags, the hosting fact last", () => {
    const hosted: HostedState = {
      isTaskApp: true,
      models,
      isLoading: false,
      error: null,
      keyState: "set",
      defaultModel: "alpha/one",
      chosen: null,
      fields: null,
      choose: () => undefined,
    }
    const rows = pickerSections(hosted)
      .filter((section) => section.id === "all")
      .flatMap((section) => section.rows)
    const image = rows.find((row) => row.id === "alpha/one")
    const video = rows.find((row) => row.id === "beta/three")
    const graph = rows.find((row) => row.id === "open-picture")
    expect(image?.tags.map((tag) => tag.label)).toEqual(["Ran in Rosesfield"])
    expect(video?.tags.map((tag) => tag.label)).toEqual([
      "From text",
      "1080p",
      "5 to 10 s",
    ])
    expect(graph?.tags.map((tag) => tag.label)).toEqual([])
    expect(graph?.badges).toEqual([
      { kind: "openWeights", label: "Open weights", markColour: "#FFD21E" },
    ])
    expect(image?.badges).toEqual([])
    expect(pickerSections(hosted).map((section) => section.label)).toEqual([
      "Featured",
      "All",
    ])
    expect(rows.map((row) => row.lab)).toContain("Alpha")
  })
})

const mingFacts: ModelFacts = {
  lab: "inclusionAI",
  release: "2026-09-22",
  rank: {
    position: 45,
    size: 104,
    board: "Artificial Analysis Text to Image Arena",
    url: "https://artificialanalysis.ai/image/leaderboard/text-to-image",
    readOn: "2026-10-20",
  },
  priceThird: null,
  weights: "https://huggingface.co/inclusionAI/Ming-Image-0.1-Design",
  lineKey: "image.model.zImageTurbo.line",
}

describe("an open-weights row of the model picker", () => {
  const hosted: HostedState = {
    isTaskApp: true,
    models: [
      model("ming-image-0-1-design", "inclusionAI", {
        kind: "graph",
        tags: [{ kind: "open-weights" }],
        form: null,
        facts: mingFacts,
      }),
      model("beta/two", "Beta"),
    ],
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: null,
    chosen: null,
    fields: null,
    choose: () => undefined,
  }
  const rows = pickerSections(hosted, "2026-10-20")
    .filter((section) => section.id === "all")
    .flatMap((section) => section.rows)
  const ming = rows.find((row) => row.id === "ming-image-0-1-design")
  const beta = rows.find((row) => row.id === "beta/two")

  it("names its lab as its maker and in its mark, from the catalog's facts", () => {
    expect(ming?.maker).toBe("inclusionAI")
    expect(ming?.lab).toBe("inclusionAI")
    const mark = ming?.mark
    expect(
      isValidElement<{ maker: string }>(mark) ? mark.props.maker : null
    ).toBe("inclusionAI")
  })

  it("shows its board rank as a capability, and no rank for a model the facts do not rank", () => {
    expect(ming?.tags.map((tag) => tag.label)).toEqual(["Rank 45 of 104"])
    expect(beta?.tags.map((tag) => tag.label)).toEqual([])
  })

  it("opens the weights page the catalog's facts name", () => {
    expect(ming?.badges).toEqual([
      { kind: "new", label: "New" },
      {
        kind: "openWeights",
        label: "Open weights",
        href: "https://huggingface.co/inclusionAI/Ming-Image-0.1-Design",
        markColour: "#FFD21E",
      },
    ])
  })
})

describe("the prices of the model picker's rows", () => {
  const hosted: HostedState = {
    isTaskApp: true,
    models: [model("alpha/one", "Alpha"), model("beta/two", "Beta")],
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: "alpha/one",
    chosen: null,
    fields: null,
    choose: () => undefined,
  }

  it("gives each priced row its price, in the featured group too, and an unpriced row none", () => {
    const price = { amount: "6.33", name: "6.33 Comfy credits" }
    const rows = pickerSections(
      hosted,
      "2026-10-20",
      new Map([["alpha/one", price]])
    ).flatMap((section) => section.rows)
    expect(
      rows.filter((row) => row.id === "alpha/one").map((row) => row.price)
    ).toEqual([price, price])
    expect(rows.find((row) => row.id === "beta/two")).not.toHaveProperty(
      "price"
    )
  })
})

function ranked(id: string, position: number | null): CatalogModel {
  return model(id, "Lab", {
    ...(position === null
      ? {}
      : {
          facts: {
            ...mingFacts,
            rank: {
              position,
              size: 100,
              board: "Artificial Analysis Text to Image Arena",
              url: "https://artificialanalysis.ai/image/leaderboard/text-to-image",
              readOn: "2026-10-20",
            },
          },
        }),
  })
}

describe("the ranked list of an app's models", () => {
  const listed = [
    ranked("lab/unranked", null),
    ranked("lab/third", 30),
    ranked("lab/first", 3),
    ranked("lab/second", 12),
  ]

  it("leads with the app's default, then the board's order, three at most", () => {
    const ids = rankedModelsOf(
      "lab/unranked",
      listed.map((one) => ({
        id: one.id,
        rank: one.facts?.rank?.position ?? null,
      }))
    )
    expect(ids).toEqual(["lab/unranked", "lab/first", "lab/second"])
  })

  it("leads with the board's first when the default is not listed, so the app never opens on a model the picker does not show", () => {
    const ids = rankedModelsOf("gone/model", [
      { id: "lab/a", rank: 9 },
      { id: "lab/b", rank: 2 },
    ])
    expect(ids).toEqual(["lab/b", "lab/a"])
  })

  it("shows the featured row in rank order, each tagged with its rank, and opens on rank 1", () => {
    const hosted: HostedState = {
      isTaskApp: true,
      models: listed,
      isLoading: false,
      error: null,
      keyState: "set",
      defaultModel: "lab/unranked",
      chosen: null,
      fields: null,
      choose: () => undefined,
    }
    const featured = pickerSections(hosted, "2026-10-20").find(
      (section) => section.id === "featured"
    )
    expect(featured?.rows.map((row) => row.id)).toEqual([
      "lab/unranked",
      "lab/first",
      "lab/second",
    ])
    expect(featured?.rows.map((row) => row.tags[0]?.label)).toEqual([
      "1",
      "2",
      "3",
    ])
    expect(
      featured?.rows.flatMap((row) => row.tags.map((tag) => tag.label))
    ).not.toContain("Rank 3 of 100")
  })
})
