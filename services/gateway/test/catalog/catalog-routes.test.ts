import { catalogRoutes, modelListResponse } from "@rosesfield/catalog/comfy"
import { buildPath } from "@rosesfield/contract"
import { type Fetch, RouterCatalog } from "@rosesfield/generation"
import { afterEach, describe, expect, it } from "vitest"
import { type Harness, jsonInit } from "../harness"
import { demoEngine } from "../server-env"
import { closeGateways, gatewayWith } from "./catalog-gateway"
import {
  clipModel,
  fakeRouter,
  hostedWanModel,
  newPictureModel,
  pictureModel,
  routerUrl,
  wanModel,
} from "./router-recordings"

afterEach(closeGateways)

const oneHourMs = 3_600_000

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

  it("lists a model Comfy adds in the app of its task once the revalidation behind the served copy ends", async () => {
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
    const held: { catalog: RouterCatalog | null } = { catalog: null }
    const gateway = gatewayWith(fetch, (clock) => {
      held.catalog ??= new RouterCatalog({ clock })
      return held.catalog
    })
    const before = await modelsOf(gateway, "pictures")
    schemas = [pictureModel, clipModel, newPictureModel]
    gateway.clock.advance(oneHourMs)
    const served = await modelsOf(gateway, "pictures")
    await held.catalog?.idle()
    const after = await modelsOf(gateway, "pictures")
    expect(before.models.map((one) => one.id)).not.toContain("studio/sketch-1")
    expect(served.models.map((one) => one.id)).not.toContain("studio/sketch-1")
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

  it("names the fix when the Router refuses the catalog for the key, and keeps the graphs", async () => {
    const router = fakeRouter({
      schemas: [pictureModel],
      refuseCatalog: "Comfy Router is not enabled for this account yet.",
    })
    const gateway = gatewayWith(
      router.fetch,
      (clock) => new RouterCatalog({ clock })
    )
    const listed = await modelsOf(gateway, "pictures")
    expect(listed.refusal).toEqual({ code: "ENGINE_NOT_ENABLED", status: 412 })
    expect(listed.models.map((one) => [one.id, one.kind])).toEqual([
      ["open-picture", "graph"],
      ["open-sketch", "graph"],
    ])
  })
  it("names the fix on the next open once the Router refuses the key's reload of a warm list", async () => {
    let refuse: string | undefined
    const fetch: Fetch = (input, init) =>
      fakeRouter({
        schemas: [pictureModel],
        ...(refuse === undefined ? {} : { refuseCatalog: refuse }),
      }).fetch(input, init)
    const held: { catalog: RouterCatalog | null } = { catalog: null }
    const gateway = gatewayWith(fetch, (clock) => {
      held.catalog ??= new RouterCatalog({ clock })
      return held.catalog
    })
    expect((await modelsOf(gateway, "pictures")).refusal).toBeNull()
    refuse = "Comfy Router is not enabled for this account yet."
    gateway.clock.advance(oneHourMs)
    expect((await modelsOf(gateway, "pictures")).refusal).toBeNull()
    await held.catalog?.idle()
    const listed = await modelsOf(gateway, "pictures")
    expect(listed.refusal).toEqual({ code: "ENGINE_NOT_ENABLED", status: 412 })
    expect(listed.models.every((one) => one.kind === "graph")).toBe(true)
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

  it("comes from the published rates on the demo engine, with no estimate asked", async () => {
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
      (clock) => new RouterCatalog({ clock }),
      demoEngine
    )
    const response = await gateway.call(
      buildPath(catalogRoutes.priceRun.path, { appId: "pictures" }),
      jsonInit({ inputs: { model: "maker/picture-2", prompt: "a door" } })
    )
    expect(await response.json()).toEqual({
      price: { source: "rates", credits: 6.33 },
    })
    expect(router.calls.some((call) => call.url.endsWith("/estimate"))).toBe(
      false
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
