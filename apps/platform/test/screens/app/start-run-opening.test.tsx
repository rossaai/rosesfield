import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import type { GatewaySettings } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"
import { formatWholeCredits } from "@/copy/format"
import { bodyOf, type FormValues } from "@/screens/app/app-form"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { useStartRun } from "@/screens/app/use-start-run"

const image = appListing.parse(findApp("image"))

const keyState = "set"

type Call = { url: string; method: string; body: unknown }

const calls: Call[] = []

beforeEach(() => {
  calls.length = 0
  vi.useFakeTimers()
  vi.stubGlobal(
    "fetch",
    (input: unknown, init?: { method?: string; body?: unknown }) => {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null
      calls.push({ url: String(input), method: init?.method ?? "GET", body })
      return new Promise(() => undefined)
    }
  )
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const settings: GatewaySettings = {
  mode: "owner",
  engine: {
    target: "comfy-cloud",
    address: null,
    key: keyState,
    origin: "live",
  },
  lock: "local",
  keyFrom: "server",
  agent: "unknown",
  agentModel: null,
  place: "bun",
  retentionDays: null,
}

const values: FormValues = {
  inputs: { prompt: "a paper boat", model: "z-image-turbo" },
  seedMode: "random",
  count: 1,
  aspectRatio: null,
}

const form: AppForm = {
  values,
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
}

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

function hostedOf(change: Partial<HostedState>): HostedState {
  return {
    isTaskApp: true,
    models: [],
    isLoading: false,
    error: null,
    keyState,
    defaultModel: null,
    chosen: null,
    fields: null,
    choose: () => undefined,
    ...change,
  }
}

const opening = hostedOf({ isLoading: true })

const failed = hostedOf({
  error: new GatewayRefusedError({
    code: "RESPONSE_INVALID",
    status: 200,
    retryAfterSeconds: null,
  }),
})

const opened = hostedOf({
  models: [flux],
  defaultModel: flux.id,
  chosen: flux,
  fields: flux.form,
})

const ownCredits = 1.2

function clientWithOwnPrice(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(
    priceQuery(image.id, bodyOf(image, values), keyState).queryKey,
    {
      price: { source: "rates", credits: ownCredits },
    }
  )
  return client
}

function wrapperOf(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const asked = (): Call[] => calls.filter((call) => call.url.includes("/price"))

const started = (): Call[] =>
  calls.filter(
    (call) =>
      call.method === "POST" && call.url.endsWith(`/api/apps/${image.id}/runs`)
  )

const startedModels = (): unknown[] =>
  started().map((call) =>
    typeof call.body === "object" &&
    call.body !== null &&
    "inputs" in call.body &&
    typeof call.body.inputs === "object" &&
    call.body.inputs !== null &&
    "model" in call.body.inputs
      ? call.body.inputs.model
      : null
  )

describe("Generate while a hosted screen's model list opens", () => {
  it("shows no price, asks none, holds Generate busy, and starts no run before the list arrives, then starts the model the list opens on", async () => {
    const { result, rerender } = renderHook(
      ({ hosted }) => useStartRun(image, form, undefined, hosted),
      {
        wrapper: wrapperOf(clientWithOwnPrice()),
        initialProps: { hosted: opening },
      }
    )
    expect(result.current.priceValue).toBeNull()
    expect(result.current.priceName).toBeNull()
    expect(result.current.isPending).toBe(true)
    act(() => vi.advanceTimersByTime(100))
    expect(asked()).toHaveLength(0)
    await act(async () => result.current.generate())
    rerender({ hosted: opened })
    expect(result.current.isPending).toBe(false)
    await act(async () => result.current.generate())
    await vi.waitFor(() => expect(started()).not.toHaveLength(0))
    expect(startedModels()).toEqual([flux.id])
  })

  it("control: prices and starts the app's own run once the list has failed, so Generate never waits on a list that will not come", async () => {
    const { result } = renderHook(
      () => useStartRun(image, form, undefined, failed),
      { wrapper: wrapperOf(clientWithOwnPrice()) }
    )
    expect(result.current.isPending).toBe(false)
    expect(result.current.priceValue).toBe(formatWholeCredits(ownCredits))
    await act(async () => result.current.generate())
    await vi.waitFor(() => expect(started()).not.toHaveLength(0))
    expect(startedModels()).toEqual(["z-image-turbo"])
  })
})
