import { appDefinition } from "@rosesfield/contract"
import { taskBinding } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import {
  appTasksOf,
  defaultModelOf,
  graphMaker,
  isOpenWeights,
  modelsForApp,
} from "#comfy/list-models"
import { findApp } from "#list-apps"

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
  it("marks every model of a proven family with the proven tag and names a graph with no known lab by Comfy Cloud", () => {
    const models = modelsForApp(app, [
      {
        id: "luma/photon-flash-1",
        provider: "luma",
        takes: ["text"],
        makes: ["image"],
        takesTools: false,
        form: null,
      },
      {
        id: "maker/picture",
        provider: "maker",
        takes: ["text"],
        makes: ["image"],
        takesTools: false,
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

describe("a graph's task", () => {
  it("is the task its binding names, and the app's first task when it names none", () => {
    const withTasks = appDefinition.parse({
      ...app,
      engine: taskBinding({
        tasks: ["text-to-image"],
        input: "model",
        default: "open-a",
        fallback: { adapter: "demo", config: {} },
        graphTasks: { "open-b": "image-edit" },
      }),
    })
    const tasksOf = (definition: typeof app) =>
      modelsForApp(definition, []).map((one) => [one.id, one.task])
    expect(tasksOf(withTasks)).toEqual([
      ["open-a", "text-to-image"],
      ["open-b", "image-edit"],
    ])
    expect(tasksOf(app)).toEqual([
      ["open-a", "text-to-image"],
      ["open-b", "text-to-image"],
    ])
  })
})

describe("the reference platform's own models", () => {
  it("are left out of the listing, by provider and by name", () => {
    const hosted = (id: string) => ({
      id,
      provider: id.split("/")[0] ?? "",
      takes: ["text"],
      makes: ["image"],
      takesTools: false,
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

  it("gives each model the facts the catalog holds for it, with the board and the date of its rank, and no line to a graph whose fact row holds none, rather than its app's own words", () => {
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
    expect(byId("open-a")?.facts?.lineKey).toBeNull()
  })

  it("lists a background model only in the app that makes its media, an image one in Remove background and a video one in Video edit", () => {
    const image = {
      id: "maker/remove-background",
      provider: "maker",
      takes: ["image"],
      makes: ["image"],
      form: null,
    }
    const video = {
      id: "maker/video-background-removal",
      provider: "maker",
      takes: ["video"],
      makes: ["video"],
      form: null,
    }
    const hostedIn = (appId: string): string[] => {
      const found = findApp(appId)
      if (found === null) {
        throw new Error(`the catalog lacks ${appId}`)
      }
      return modelsForApp(found, [image, video])
        .filter((one) => one.kind === "hosted")
        .map((one) => one.id)
    }
    expect(hostedIn("background-removal")).toEqual([image.id])
    expect(hostedIn("video-edit")).toEqual([video.id])
  })
})

describe("the model list of an app that declares no task", () => {
  const editor = {
    id: "maker/image-editor",
    provider: "maker",
    takes: ["image", "text"],
    makes: ["image"],
    form: null,
  }
  const listedIn = (appId: string) => {
    const found = findApp(appId)
    if (found === null) {
      throw new Error(`the catalog lacks ${appId}`)
    }
    return { found, models: modelsForApp(found, [editor]) }
  }

  it("lists the graph Angles and Headshots run as their one model and opens on it", () => {
    for (const appId of ["angles", "headshots"]) {
      const { found, models } = listedIn(appId)
      expect(models.map((one) => [one.id, one.kind, one.task])).toEqual([
        ["qwen-image-edit-2511", "graph", null],
      ])
      expect(models[0]?.maker).toBe("Alibaba Qwen")
      expect(models[0]?.facts?.lineKey).toBe(
        "comfy.model.graphQwenImageEdit2511.line"
      )
      expect(defaultModelOf(found)).toBe("qwen-image-edit-2511")
      expect(appTasksOf(found)).toEqual([])
    }
  })

  it("names the graph of Voice change and Music by the label of their model option", () => {
    expect(listedIn("voice-change").models.map((one) => one.nameKey)).toEqual([
      "audio.model.chatterboxVc",
    ])
    expect(listedIn("music").models.map((one) => one.nameKey)).toEqual([
      "audio.model.minimaxMusic3",
    ])
  })

  it("lists nothing for Remake and Effects, which run no graph as a model, the control", () => {
    for (const appId of ["remake", "effects"]) {
      const { found, models } = listedIn(appId)
      expect(models).toEqual([])
      expect(defaultModelOf(found)).toBeNull()
    }
  })
})
