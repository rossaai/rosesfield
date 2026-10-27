import { findApp } from "@rosesfield/catalog"
import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"
import { formatWholeCredits } from "@/copy/format"
import { t } from "@/copy/t"
import { heldQuoteOf, type Quote } from "@/screens/app/held-quote"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { priceLabelsOf, useStartRun } from "@/screens/app/use-start-run"

const asked: string[] = []

beforeEach(() => {
  asked.length = 0
  vi.useFakeTimers()
  vi.stubGlobal("fetch", (url: string | URL | Request) => {
    asked.push(String(url))
    return new Promise(() => undefined)
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const count: ModelField = {
  kind: "number",
  name: "n",
  path: "n",
  required: false,
  min: 1,
  max: 4,
  integer: true,
  default: 1,
}

const perOutput: Quote = { credits: 6, source: "rates", perOutput: true }

describe("the price Generate holds while the next one loads", () => {
  it("multiplies on the client when only the count changed on a model priced per output", () => {
    const answered = {
      body: { inputs: { model: "m", n: 1 } },
      quote: perOutput,
    }
    expect(
      heldQuoteOf(answered, { inputs: { model: "m", n: 3 } }, [count])
    ).toEqual({ ...perOutput, credits: 18 })
    expect(
      heldQuoteOf(
        { body: { inputs: { model: "m" } }, quote: perOutput },
        { inputs: { model: "m" }, count: 2 },
        []
      )
    ).toEqual({ ...perOutput, credits: 12 })
  })

  it("keeps the last price, unscaled, when the model is not priced per output or another setting changed", () => {
    const flat: Quote = { credits: 6, source: "rates" }
    expect(
      heldQuoteOf(
        { body: { inputs: { model: "m", n: 1 } }, quote: flat },
        { inputs: { model: "m", n: 3 } },
        [count]
      )
    ).toEqual(flat)
    expect(
      heldQuoteOf(
        { body: { inputs: { model: "m", n: 1 } }, quote: perOutput },
        { inputs: { model: "m", n: 3, size: "2k" } },
        [count]
      )
    ).toEqual(perOutput)
  })

  it("writes a range as its low to its high, named an estimate", () => {
    const amount = t("field.number.range", { min: "10", max: "20" })
    expect(priceLabelsOf(20, false, "estimate", 10)).toEqual({
      price: "",
      priceValue: amount,
      priceName: t("run.generate.estimated", { amount }),
    })
  })
})

const image = appListing.parse(findApp("image"))

const flux: CatalogModel = {
  id: "bfl/flux-3-image",
  kind: "hosted",
  maker: "Black Forest Labs",
  name: "FLUX 3 Image",
  nameKey: null,
  task: "text-to-image",
  tags: [],
  form: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
      default: null,
    },
  ],
}

function formWith(outputs: number): AppForm {
  return {
    values: {
      inputs: { model: flux.id, prompt: "a paper boat" },
      seedMode: "random",
      count: outputs,
      aspectRatio: null,
    },
    problems: new Map(),
    setInput: () => undefined,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
}

const hosted: HostedState = {
  isTaskApp: true,
  models: [flux],
  isLoading: false,
  error: null,
  keyState: "set",
  defaultModel: flux.id,
  chosen: flux,
  fields: flux.form,
  choose: () => undefined,
}

const settings: GatewaySettings = {
  mode: "owner",
  engine: { target: "comfyui", address: null, key: "set", origin: "live" },
  lock: "local",
  keyFrom: "server",
  agent: "missing",
  agentModel: null,
  place: "bun",
  retentionDays: null,
}

describe("Generate's price across a count change", () => {
  it("never blanks: it shows the multiplied price at once, asks 100 ms after the change, and keeps it while the answer loads", () => {
    const client = new QueryClient()
    client.setQueryData(settingsQuery.queryKey, settings)
    client.setQueryData(
      priceQuery(
        image.id,
        { inputs: { model: flux.id, prompt: "a paper boat" } },
        "set"
      ).queryKey,
      { price: { source: "rates", credits: 6.5, perOutput: true } }
    )
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result, rerender } = renderHook(
      ({ form }) => useStartRun(image, form, undefined, hosted),
      { wrapper, initialProps: { form: formWith(1) } }
    )
    expect(result.current.priceValue).toBe(formatWholeCredits(6.5))
    rerender({ form: formWith(3) })
    const tripled = formatWholeCredits(19.5)
    expect(result.current.priceValue).toBe(tripled)
    act(() => vi.advanceTimersByTime(99))
    expect(asked.filter((url) => url.includes("/price"))).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(asked.filter((url) => url.includes("/price"))).toHaveLength(1)
    expect(result.current.priceValue).toBe(tripled)
  })
})
