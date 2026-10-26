import {
  catalogRoutes,
  priceAsksMax,
  priceResponse,
  pricesResponse,
} from "@rosesfield/catalog/comfy"
import { buildPath } from "@rosesfield/contract"
import { RouterCatalog } from "@rosesfield/generation"
import { afterEach, describe, expect, it } from "vitest"
import { jsonInit } from "../harness"
import { demoEngine } from "../server-env"
import { closeGateways, gatewayWith } from "./catalog-gateway"
import { fakeRouter, pictureModel } from "./router-recordings"

afterEach(closeGateways)

describe("the prices of every row of a model list, in one request", () => {
  const rates = {
    rates: [
      {
        model_id: "maker/picture-2",
        credits: "6.33",
        unit: "per generation",
        conditions: "",
      },
    ],
  }

  it("prices each ask in its own order, a graph with no known price as unknown", async () => {
    const router = fakeRouter({ schemas: [pictureModel], rates })
    const gateway = gatewayWith(
      router.fetch,
      (clock) => new RouterCatalog({ clock }),
      demoEngine
    )
    const response = await gateway.call(
      buildPath(catalogRoutes.priceRuns.path, { appId: "pictures" }),
      jsonInit({
        asks: [
          { inputs: { model: "open-picture", prompt: "a door" } },
          { inputs: { model: "maker/picture-2", prompt: "a door" } },
        ],
      })
    )
    expect(response.status).toBe(200)
    expect(pricesResponse.parse(await response.json())).toEqual({
      prices: [
        { source: "unknown", credits: null },
        {
          source: "rates",
          credits: 6.33,
          from: "rate-card",
          perOutput: true,
        },
      ],
    })
  })

  it("answers the same price for a row as the one-model route", async () => {
    const router = fakeRouter({ schemas: [pictureModel], rates })
    const gateway = gatewayWith(
      router.fetch,
      (clock) => new RouterCatalog({ clock })
    )
    const ask = { inputs: { model: "maker/picture-2", prompt: "a door" } }
    const one = await gateway.call(
      buildPath(catalogRoutes.priceRun.path, { appId: "pictures" }),
      jsonInit(ask)
    )
    const all = await gateway.call(
      buildPath(catalogRoutes.priceRuns.path, { appId: "pictures" }),
      jsonInit({ asks: [ask] })
    )
    const { price } = priceResponse.parse(await one.json())
    expect(await all.json()).toEqual({ prices: [price] })
  })

  it("gives a model no engine knows an unknown price and still prices the rest", async () => {
    const router = fakeRouter({ schemas: [pictureModel], rates })
    const gateway = gatewayWith(
      router.fetch,
      (clock) => new RouterCatalog({ clock })
    )
    const response = await gateway.call(
      buildPath(catalogRoutes.priceRuns.path, { appId: "pictures" }),
      jsonInit({
        asks: [
          { inputs: { model: "maker/gone-1", prompt: "a door" } },
          { inputs: { model: "maker/picture-2", prompt: "a door" } },
        ],
      })
    )
    expect(await response.json()).toEqual({
      prices: [
        { source: "unknown", credits: null },
        {
          source: "rates",
          credits: 6.33,
          from: "rate-card",
          perOutput: true,
        },
      ],
    })
  })

  it("refuses an empty list, a list past its bound and an app it does not serve, the control", async () => {
    const router = fakeRouter({ schemas: [pictureModel], rates })
    const gateway = gatewayWith(
      router.fetch,
      (clock) => new RouterCatalog({ clock })
    )
    const ask = { inputs: { model: "open-picture", prompt: "a door" } }
    const path = buildPath(catalogRoutes.priceRuns.path, { appId: "pictures" })
    const empty = await gateway.call(path, jsonInit({ asks: [] }))
    const many = await gateway.call(
      path,
      jsonInit({ asks: Array.from({ length: priceAsksMax + 1 }, () => ask) })
    )
    const most = await gateway.call(
      path,
      jsonInit({ asks: Array.from({ length: priceAsksMax }, () => ask) })
    )
    const elsewhere = await gateway.call(
      buildPath(catalogRoutes.priceRuns.path, { appId: "nowhere" }),
      jsonInit({ asks: [ask] })
    )
    expect([empty.status, many.status, elsewhere.status]).toEqual([
      400, 400, 404,
    ])
    expect(most.status).toBe(200)
    expect(pricesResponse.parse(await most.json()).prices).toHaveLength(
      priceAsksMax
    )
  })
})
