import { findApp } from "@rosesfield/catalog"
import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FormValues } from "@/screens/app/app-form"
import { ChoiceModelPicker } from "@/screens/app/bar/model-settings"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { settingsFor } from "@/screens/app/hosted/hosted-form"
import {
  type HostedState,
  priceAskOf,
} from "@/screens/app/hosted/use-hosted-model"
import { rowPriceOf, rowPricesOf } from "@/screens/app/hosted/use-row-prices"
import { AdsCatalogPicker } from "@/studio/ads/ads-model-picker"

const image = appListing.parse(findApp("image"))
const ads = appListing.parse(findApp("ads"))

const length: ModelField = {
  kind: "number",
  name: "duration",
  path: "duration",
  required: false,
  min: 5,
  max: 10,
  integer: true,
  default: 5,
}

const quality: ModelField = {
  kind: "choice",
  name: "resolution",
  path: "resolution",
  required: false,
  options: ["720p", "1080p"],
  default: "720p",
}

const prompt: ModelField = {
  kind: "prompt",
  name: "prompt",
  path: "prompt",
  required: true,
  maxLength: null,
  default: null,
}

function hosted(id: string, maker: string, form: ModelField[]): CatalogModel {
  return {
    id,
    kind: "hosted",
    maker,
    name: id.split("/")[1] ?? id,
    nameKey: null,
    task: "text-to-image",
    tags: [{ kind: "hosted" }],
    form,
  }
}

const alpha = hosted("alpha/one", "Alpha", [prompt, length, quality])
const beta = hosted("beta/two", "Beta", [prompt, length])
const graph: CatalogModel = {
  ...hosted("open-picture", "Open", []),
  kind: "graph",
  form: null,
}

const values: FormValues = {
  inputs: {
    model: alpha.id,
    prompt: "a paper boat",
    duration: 8,
    resolution: "1080p",
  },
  seedMode: "random",
  count: 1,
  aspectRatio: "1:1",
}

describe("the settings a row is priced at", () => {
  it("keeps each current value the model's field takes, and its own default for a value it does not", () => {
    expect(settingsFor([prompt, length, quality], values.inputs)).toEqual({
      prompt: "a paper boat",
      duration: 8,
      resolution: "1080p",
    })
    expect(
      settingsFor([length, quality], {
        duration: 12,
        resolution: "4K",
      })
    ).toEqual({ duration: 5, resolution: "720p" })
  })

  it("asks each hosted model at its own fields and a graph at the app's inputs, with the model named", () => {
    expect(priceAskOf(image, values, beta)).toEqual({
      inputs: { model: "beta/two", prompt: "a paper boat", duration: 8 },
    })
    const ask = priceAskOf(image, values, graph)
    expect(ask.inputs).toMatchObject({
      model: "open-picture",
      prompt: "a paper boat",
    })
    expect(ask.inputs).not.toHaveProperty("duration")
  })
})

describe("the price a row shows", () => {
  it("is the credits with their name, and nothing for an unknown or empty price", () => {
    expect(rowPriceOf(6.33)).toEqual({
      amount: "6.33",
      name: "6.33 Comfy credits",
    })
    expect(rowPriceOf(null)).toBeNull()
    expect(rowPriceOf(0)).toBeNull()
  })

  it("matches each answer to the model at its place", () => {
    const prices = rowPricesOf(["alpha/one", "beta/two", "open-picture"], {
      prices: [
        { source: "rates", credits: 6.33 },
        { source: "unknown", credits: null },
        { source: "measured", credits: 2 },
      ],
    })
    expect([...prices.keys()]).toEqual(["alpha/one", "open-picture"])
    expect(prices.get("open-picture")?.amount).toBe("2")
  })
})

type Call = { url: string; body: unknown }

let calls: Call[] = []

function priceCalls(): Call[] {
  return calls.filter((call) => call.url.includes("/prices"))
}

beforeEach(() => {
  calls = []
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const body: unknown = JSON.parse(String(init?.body ?? "null"))
    calls.push({ url: String(url), body })
    return Response.json({
      prices: [
        { source: "rates", credits: 6.33 },
        { source: "unknown", credits: null },
        { source: "unknown", credits: null },
      ],
    })
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function hostedState(withPricing: boolean): HostedState {
  return {
    isTaskApp: true,
    models: [alpha, beta, graph],
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: alpha.id,
    chosen: alpha,
    fields: alpha.form,
    ranBefore: [],
    choose: () => undefined,
    ...(withPricing
      ? {
          pricing: {
            appId: image.id,
            askOf: (model: CatalogModel) => priceAskOf(image, values, model),
          },
        }
      : {}),
  }
}

function renderPicker(withPricing = true): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CatalogPicker hosted={hostedState(withPricing)} />
    </QueryClientProvider>
  )
}

describe("the model picker's prices", () => {
  it("asks nothing while it is closed", async () => {
    renderPicker()
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(calls).toEqual([])
  })

  it("prices every row in one request when it opens, and shows a price only where one is known", async () => {
    renderPicker()
    fireEvent.click(screen.getByRole("button", { name: /Model/ }))
    await act(() => vi.advanceTimersByTimeAsync(400))
    await waitFor(() =>
      expect(
        screen.getAllByRole("option", { name: "one, 6.33 Comfy credits" })
      ).toHaveLength(2)
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toContain("/api/apps/image/prices")
    expect(calls[0]?.body).toEqual({
      asks: [
        priceAskOf(image, values, alpha),
        priceAskOf(image, values, beta),
        priceAskOf(image, values, graph),
      ],
    })
    expect(screen.getByRole("option", { name: "two" })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/unknown/i)
  })

  it("asks nothing for a picker whose state carries no pricing, the control", async () => {
    renderPicker(false)
    fireEvent.click(screen.getByRole("button", { name: /Model/ }))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(calls).toEqual([])
    expect(screen.getAllByRole("option", { name: "one" }).length).toBe(2)
  })
})

describe("the Ads model picker's prices", () => {
  it("prices every row in one request when it opens", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdsCatalogPicker app={ads} hosted={hostedState(true)} place="chip" />
      </QueryClientProvider>
    )
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(calls).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: /Model/ }))
    await act(() => vi.advanceTimersByTimeAsync(400))
    await waitFor(() =>
      expect(
        screen.getAllByRole("option", { name: /^one, 6.33 Comfy credits/ })
      ).not.toHaveLength(0)
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toContain("/api/apps/image/prices")
  })
})

describe("the bar's model picker's prices", () => {
  const model = {
    type: "choice" as const,
    name: "model",
    labelKey: "image.input.model.label",
    options: ["first", "second", "third"].map((value) => ({
      value,
      labelKey: "image.input.model.label",
    })),
    default: "first",
  }

  it("prices each choice at the current settings in one request when it opens", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ChoiceModelPicker
          model={model}
          value="first"
          onChoose={() => undefined}
          settings={null}
          pricing={{
            appId: "expand",
            askOf: (id) => ({ inputs: { model: id, prompt: "a boat" } }),
          }}
        />
      </QueryClientProvider>
    )
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(priceCalls()).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: /Model/ }))
    await act(() => vi.advanceTimersByTimeAsync(400))
    await waitFor(() => expect(document.body.textContent).toContain("6.33"))
    expect(priceCalls()).toHaveLength(1)
    expect(priceCalls()[0]?.url).toContain("/api/apps/expand/prices")
    expect(priceCalls()[0]?.body).toEqual({
      asks: ["first", "second", "third"].map((id) => ({
        inputs: { model: id, prompt: "a boat" },
      })),
    })
  })
})
