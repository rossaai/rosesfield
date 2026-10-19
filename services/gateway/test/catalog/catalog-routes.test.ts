import { catalogRoutes, modelListResponse } from "@rosesfield/catalog/comfy"
import {
  appDefinition,
  buildPath,
  type EngineBinding,
} from "@rosesfield/contract"
import { type Fetch, RouterCatalog, taskBinding } from "@rosesfield/generation"
import type { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { pickEngines } from "#compose/pick-engines"
import { type Harness, harnessFor, jsonInit, type PortsFor } from "../harness"
import { localPorts } from "../local-ports"
import { comfyCloud } from "../server-env"
import {
  clipModel,
  fakeRouter,
  hostedWanModel,
  newPictureModel,
  pictureModel,
  routerUrl,
  wanModel,
} from "./router-recordings"

const oneHourMs = 3_600_000

const graph: EngineBinding = { adapter: "demo", config: {} }

function taskApp(id: string, tasks: string[]) {
  return appDefinition.parse({
    id,
    nameKey: "name",
    category: "image",
    inputs: [
      {
        type: "prompt",
        name: "prompt",
        labelKey: "inputs.prompt",
        presence: "required",
        maxLength: 2000,
      },
      {
        type: "choice",
        name: "model",
        labelKey: "inputs.model",
        options: [
          { value: "open-picture", labelKey: "model.openPicture" },
          { value: "open-sketch", labelKey: "model.openSketch" },
        ],
        default: "open-picture",
      },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1"], default: "1:1" },
    },
    engine: taskBinding({
      tasks,
      input: "model",
      default: "maker/picture-2",
      fallback: graph,
    }),
    limits: { timeoutSeconds: 600, maxRetries: 2 },
  })
}

const apps = [
  taskApp("pictures", ["text-to-image"]),
  taskApp("clips", ["text-to-video"]),
]

function portsWith(
  fetch: Fetch,
  catalog: (clock: FixedClock) => RouterCatalog
): PortsFor {
  return (clock, folder) => ({
    ...localPorts(clock, folder),
    apps,
    engines: pickEngines(comfyCloud("comfyui-owner"), {
      clock,
      fetch,
      catalog: catalog(clock),
    }),
  })
}

let open: Harness[] = []

afterEach(() => {
  for (const one of open) {
    one.close()
  }
  open = []
})

function gatewayWith(
  fetch: Fetch,
  catalog: (clock: FixedClock) => RouterCatalog
): Harness {
  const gateway = harnessFor({ portsFor: portsWith(fetch, catalog) })
  open.push(gateway)
  return gateway
}

async function modelsOf(gateway: Harness, appId: string) {
  const response = await gateway.call(
    buildPath(catalogRoutes.listModels.path, { appId })
  )
  expect(response.status).toBe(200)
  return modelListResponse.parse(await response.json())
}

describe("the model list of an app", () => {
  it("lists every hosted model of the app's task beside its graphs, each with a maker, a name and its form", async () => {
    const router = fakeRouter({ schemas: [pictureModel, clipModel] })
    const gateway = gatewayWith(
      router.fetch,
      (clock) => new RouterCatalog({ clock })
    )
    const pictures = await modelsOf(gateway, "pictures")
    expect(pictures.defaultModel).toBe("maker/picture-2")
    expect(pictures.models.map((one) => [one.id, one.kind])).toEqual([
      ["open-picture", "graph"],
      ["open-sketch", "graph"],
      ["maker/picture-2", "hosted"],
    ])
    expect(pictures.models[2]).toMatchObject({
      maker: "Maker",
      name: "Picture 2",
      task: "text-to-image",
    })
    expect(pictures.models[2]?.form?.map((field) => field.name)).toEqual([
      "prompt",
      "aspectRatio",
    ])
    const clips = await modelsOf(gateway, "clips")
    expect(clips.models.find((one) => one.kind === "hosted")).toMatchObject({
      id: "maker/clip-3",
      tags: [
        { kind: "hosted" },
        { kind: "resolution", value: "1080p" },
        { kind: "length", min: 5, max: 10 },
        { kind: "sound" },
      ],
    })
    expect(router.calls.every((call) => call.key === "comfyui-owner")).toBe(
      true
    )
  })

  it("lists a model Comfy adds in the app of its task after the next revalidation", async () => {
    let schemas = [pictureModel, clipModel]
    const router = fakeRouter({ schemas: [] })
    const fetch: Fetch = (input, init) =>
      fakeRouter({ schemas })
        .fetch(input, init)
        .then((answer) => {
          router.calls.push({
            method: init?.method ?? "GET",
            url: String(input),
            key: null,
          })
          return answer
        })
    let shared: RouterCatalog | null = null
    const gateway = gatewayWith(fetch, (clock) => {
      shared ??= new RouterCatalog({ clock })
      return shared
    })
    const before = await modelsOf(gateway, "pictures")
    schemas = [pictureModel, clipModel, newPictureModel]
    gateway.clock.advance(oneHourMs)
    const after = await modelsOf(gateway, "pictures")
    expect(before.models.map((one) => one.id)).not.toContain("studio/sketch-1")
    expect(after.models.map((one) => one.id)).toContain("studio/sketch-1")
    expect(
      (await modelsOf(gateway, "clips")).models.map((one) => one.id)
    ).not.toContain("studio/sketch-1")
  })

  it("hides every Wan model through the deny list", async () => {
    const router = fakeRouter({
      schemas: [pictureModel, wanModel, hostedWanModel],
    })
    const gateway = gatewayWith(
      router.fetch,
      (clock) => new RouterCatalog({ clock })
    )
    const ids = (await modelsOf(gateway, "pictures")).models.map(
      (one) => one.id
    )
    expect(ids).toContain("maker/picture-2")
    expect(ids.filter((id) => /wan/.test(id))).toEqual([])
  })

  it("names the fix when the Router refuses the catalog for the key", async () => {
    const router = fakeRouter({
      schemas: [pictureModel],
      refuseCatalog: "Comfy Router is not enabled for this account yet.",
    })
    const gateway = gatewayWith(
      router.fetch,
      (clock) => new RouterCatalog({ clock })
    )
    const response = await gateway.call(
      buildPath(catalogRoutes.listModels.path, { appId: "pictures" })
    )
    expect(response.status).toBe(412)
    expect(await response.json()).toEqual({
      error: { code: "ENGINE_NOT_ENABLED", status: 412 },
    })
  })
})

describe("the price of a run", () => {
  it("comes from the published rates when the estimate answers not_enabled", async () => {
    const router = fakeRouter({
      schemas: [pictureModel],
      rates: {
        rates: [
          {
            model_id: "maker/picture-2",
            credits: "6.33",
            unit: "per generation",
            conditions: "",
          },
        ],
      },
    })
    const gateway = gatewayWith(
      router.fetch,
      (clock) => new RouterCatalog({ clock })
    )
    const response = await gateway.call(
      buildPath(catalogRoutes.priceRun.path, { appId: "pictures" }),
      jsonInit({ inputs: { model: "maker/picture-2", prompt: "a door" } })
    )
    expect(await response.json()).toEqual({
      price: { source: "rates", credits: 6.33 },
    })
    expect(router.calls.some((call) => call.url.endsWith("/estimate"))).toBe(
      true
    )
  })

  it("is unknown for a graph", async () => {
    const router = fakeRouter({ schemas: [pictureModel] })
    const gateway = gatewayWith(
      router.fetch,
      (clock) => new RouterCatalog({ clock })
    )
    const response = await gateway.call(
      buildPath(catalogRoutes.priceRun.path, { appId: "pictures" }),
      jsonInit({ inputs: { model: "open-picture", prompt: "a door" } })
    )
    expect(await response.json()).toEqual({
      price: { source: "unknown", credits: null },
    })
    expect(router.calls.some((call) => call.url.startsWith(routerUrl))).toBe(
      false
    )
  })
})
