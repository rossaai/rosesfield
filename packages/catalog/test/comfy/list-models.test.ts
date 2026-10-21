import { appDefinition } from "@rosesfield/contract"
import { taskBinding } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { graphMaker, isOpenWeights, modelsForApp } from "#comfy/list-models"

const app = appDefinition.parse({
  id: "pictures",
  nameKey: "name",
  category: "image",
  inputs: [
    {
      type: "prompt",
      name: "prompt",
      labelKey: "inputs.prompt",
      presence: "required",
      maxLength: 100,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "inputs.model",
      options: [
        { value: "open-a", labelKey: "model.openA" },
        { value: "open-b", labelKey: "model.openB" },
      ],
      default: "open-a",
    },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 1 },
    aspectRatios: { options: ["1:1"], default: "1:1" },
  },
  engine: taskBinding({
    tasks: ["text-to-image"],
    input: "model",
    default: "open-a",
    fallback: { adapter: "demo", config: {} },
  }),
  limits: { timeoutSeconds: 60, maxRetries: 0 },
})

describe("modelsForApp", () => {
  it("marks every model of a proven family with the proven tag and names graphs by an id", () => {
    const models = modelsForApp(app, [
      {
        id: "luma/photon-flash-1",
        provider: "luma",
        takes: ["text"],
        makes: ["image"],
        form: null,
      },
      {
        id: "maker/picture",
        provider: "maker",
        takes: ["text"],
        makes: ["image"],
        form: null,
      },
    ])
    const tagsOf = (id: string) =>
      models.find((one) => one.id === id)?.tags.map((tag) => tag.kind)
    expect(tagsOf("luma/photon-flash-1")).toEqual(["hosted", "proven"])
    expect(tagsOf("maker/picture")).toEqual(["hosted"])
    expect(
      models.filter((one) => one.kind === "graph").map((one) => one.maker)
    ).toEqual([graphMaker, graphMaker])
    expect(graphMaker).toBe("comfy-cloud")
  })
})

describe("the reference platform's own models", () => {
  it("are left out of the listing, by provider and by name", () => {
    const hosted = (id: string) => ({
      id,
      provider: id.split("/")[0] ?? "",
      takes: ["text"],
      makes: ["image"],
      form: null,
    })
    const models = modelsForApp(app, [
      hosted("higgsfield/higgsfield-kling-3-pro"),
      hosted("higgsfield/higgsfield-kling-3-4k"),
      hosted("fal/higgsfield-soul"),
      hosted("kling/kling-3.0-turbo"),
    ])
    expect(
      models.filter((one) => one.kind === "hosted").map((one) => one.id)
    ).toEqual(["kling/kling-3.0-turbo"])
  })
})

describe("the order of the listing", () => {
  const hosted = (id: string) => ({
    id,
    provider: id.split("/")[0] ?? "",
    takes: ["text"],
    makes: ["image"],
    form: null,
  })

  it("lists the open-weights models first, graphs then hosted, then every other model of the task", () => {
    const models = modelsForApp(app, [
      hosted("openai/gpt-image-2"),
      hosted("ideogram/ideogram-v4"),
      hosted("bria/fibo"),
    ])
    expect(models.map((one) => [one.id, isOpenWeights(one)])).toEqual([
      ["open-a", true],
      ["open-b", true],
      ["bria/fibo", true],
      ["ideogram/ideogram-v4", true],
      ["openai/gpt-image-2", false],
    ])
  })

  it("gives each model the facts the catalog holds for it, with the board and the date of its rank", () => {
    const models = modelsForApp(app, [
      hosted("openai/gpt-image-2"),
      hosted("maker/picture"),
    ])
    const byId = (id: string) => models.find((one) => one.id === id)
    expect(byId("openai/gpt-image-2")).toMatchObject({
      tags: [{ kind: "hosted" }, { kind: "proven" }],
      facts: {
        lab: "OpenAI",
        release: "2026-04-21",
        rank: {
          position: 3,
          size: 104,
          board: "Artificial Analysis Text to Image Arena",
          readOn: "2026-10-20",
        },
        priceThird: 1,
        weights: null,
        lineKey: null,
      },
    })
    expect(byId("maker/picture")?.facts).toEqual({
      lab: null,
      release: null,
      rank: null,
      priceThird: null,
      weights: null,
      lineKey: null,
    })
    expect(byId("open-a")?.facts?.lineKey).toBe("model.openA.line")
  })
})
