import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { useStartRun } from "@/screens/app/use-start-run"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
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

const form: AppForm = {
  values: {
    inputs: { model: flux.id, prompt: "a paper boat" },
    seedMode: "random",
    count: 1,
    aspectRatio: null,
  },
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
}

const hosted: HostedState = {
  models: [flux],
  isLoading: false,
  error: null,
  keyState: "missing",
  defaultModel: flux.id,
  chosen: flux,
  fields: flux.form,
  ranBefore: [],
  choose: () => undefined,
}

describe("the price on Generate for a hosted model", () => {
  it("says the demo engine charges nothing when the server runs on the demo engine", () => {
    const client = new QueryClient()
    client.setQueryData(settingsQuery.queryKey, {
      mode: "owner",
      engine: { target: "demo", address: null, key: "missing", origin: "demo" },
      lock: "local",
      agent: { model: "missing", models: [] },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () => useStartRun(image, form, undefined, hosted),
      { wrapper }
    )
    expect(result.current.price).toBe(t("run.price.demo"))
    expect(result.current.priceValue ?? null).toBeNull()
  })
})
