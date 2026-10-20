import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { pickerSections } from "@/screens/app/hosted/catalog-picker"
import { modelSections } from "@/screens/app/hosted/model-sections"
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
  it("puts your default and the models you ran before under Featured, then every model under All", () => {
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

  it("gives an image row its line and a video row its factual tags", () => {
    const hosted: HostedState = {
      isTaskApp: true,
      models,
      isLoading: false,
      error: null,
      keyState: "set",
      defaultModel: "alpha/one",
      chosen: null,
      fields: null,
      ranBefore: [],
      choose: () => undefined,
    }
    const rows = pickerSections(hosted).flatMap((section) => section.rows)
    const image = rows.find((row) => row.id === "alpha/one")
    const video = rows.find((row) => row.id === "beta/three")
    const graph = rows.find((row) => row.id === "open-picture")
    expect(image).toMatchObject({ line: "Makes an image from your words" })
    expect(image?.tags.map((tag) => tag.label)).toEqual(["Ran in Rosesfield"])
    expect(video?.tags.map((tag) => tag.label)).toEqual(["1080p", "5 to 10 s"])
    expect(graph?.tags.map((tag) => tag.label)).toEqual([])
    expect(graph?.badges).toEqual([
      { kind: "openWeights", label: "Open weights" },
    ])
    expect(image?.badges).toEqual([])
    expect(pickerSections(hosted).map((section) => section.label)).toEqual([
      "Featured",
      "All",
    ])
  })
})
