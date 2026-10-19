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
    proven: false,
    form: [],
    ...change,
  }
}

const models = [
  model("open-picture", "Comfy Cloud", {
    kind: "graph",
    tags: [{ kind: "open-weights" }],
    form: null,
  }),
  model("alpha/one", "Alpha"),
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
  it("puts your default and the models you ran before first, then every model by maker", () => {
    const sections = modelSections(
      models,
      ["beta/two", "alpha/one", "beta/two", "gone/model"],
      (one) => one.name
    )
    expect(
      sections.map((section) => [
        section.label,
        section.rows.map((row) => row.id),
      ])
    ).toEqual([
      [null, ["beta/two", "alpha/one"]],
      ["Comfy Cloud", ["open-picture"]],
      ["Alpha", ["alpha/one"]],
      ["Beta", ["beta/two", "beta/three"]],
    ])
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
    expect(image).toMatchObject({
      line: "Makes an image from your words",
      tags: [],
    })
    expect(video?.tags.map((tag) => tag.label)).toEqual(["1080p", "5 to 10 s"])
    expect(graph?.tags.map((tag) => tag.label)).toEqual(["Open weights"])
    expect(pickerSections(hosted)[0]?.label).toBe("Your models")
  })
})
