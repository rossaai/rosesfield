import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react"
import { type ReactNode, useCallback, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { liveSettings } from "@/gallery/screens/screen-fixtures"
import {
  defaultsOf,
  type FieldValue,
  type FormValues,
} from "@/screens/app/app-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import type { FileFacts, FileReading } from "@/studio/upscale/upscale-limits"
import { UpscalePanel } from "@/studio/upscale/upscale-panel"
import { useUpscaleScreen } from "@/studio/upscale/use-upscale-screen"
import { advancedToggle, isBefore, showColumn, theModelChip } from "../column"
import { catalog, graph, upscaleListing, waveSpeed } from "./upscale-fixtures"

const listing = upscaleListing()

const world = vi.hoisted(() => {
  const first: Record<string, FieldValue> = {}
  return { first, files: new Map<string, FileFacts>() }
})

vi.mock("@/screens/app/use-app-form", () => ({
  useAppForm: (): AppForm => {
    const [values, setValues] = useState<FormValues>(() => {
      const base = defaultsOf(listing)
      return { ...base, inputs: { ...base.inputs, ...world.first } }
    })
    const setInput = useCallback((name: string, value: FieldValue) => {
      setValues((current) => ({
        ...current,
        inputs: { ...current.inputs, [name]: value },
      }))
    }, [])
    const setForm = useCallback(
      (change: Partial<FormValues>) =>
        setValues((current) => ({ ...current, ...change })),
      []
    )
    return {
      values,
      source: "defaults",
      problems: new Map(),
      setInput,
      setForm,
      fill: setValues,
      validate: () => true,
      register: () => undefined,
    }
  },
}))

vi.mock("@/screens/app/app-canvas", () => ({
  useAppRuns: () => ({
    runs: [],
    isPending: false,
    isError: false,
    refetch: () => undefined,
  }),
}))

vi.mock("@/screens/app/hosted/use-price-refresh", () => ({
  usePriceRefresh: () => undefined,
}))

vi.mock("@/screens/app/hosted/use-hosted-model", () => ({
  useHostedModel: (_app: unknown, form: AppForm): HostedState => {
    const id = form.values.inputs.model
    const models: readonly CatalogModel[] = catalog
    return {
      isTaskApp: true,
      models,
      isLoading: false,
      error: null,
      keyState: "set",
      defaultModel: graph.id,
      chosen: models.find((one) => one.id === id) ?? null,
      fields: null,
      choose: () => undefined,
    }
  },
}))

vi.mock("@/studio/upscale/use-file-facts", () => ({
  useFileFacts: (assetId: string | null): FileReading => {
    const facts = assetId === null ? undefined : world.files.get(assetId)
    return facts === undefined
      ? { state: assetId === null ? "none" : "reading" }
      : { state: "read", facts }
  },
}))

const photo = "6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e01"

type Posted = { url: string; body: unknown }

function renderUpscale(first: Record<string, FieldValue>): {
  posted: Posted[]
  result: { current: ReturnType<typeof useUpscaleScreen> }
} {
  world.first = first
  world.files.set(photo, {
    mime: "image/png",
    bytes: 2_000_000,
    width: 1024,
    height: 1024,
    seconds: null,
  })
  const posted: Posted[] = []
  vi.stubGlobal("fetch", (input: unknown, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === "POST" && url.endsWith("/api/apps/upscale/runs")) {
      posted.push({ url, body: JSON.parse(String(init.body)) })
    }
    return new Promise(() => undefined)
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(["settings"], liveSettings)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(
    () =>
      useUpscaleScreen(
        listing,
        { use: undefined, from: undefined },
        () => undefined
      ),
    { wrapper }
  )
  return { posted, result }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Generate on Upscale", () => {
  it("sends only the hosted model's own fields, with no tab and no well of the graph", async () => {
    const { posted, result } = renderUpscale({ image: [photo] })
    act(() => result.current.hosted.choose(waveSpeed.id))
    expect(result.current.form.values.inputs).toHaveProperty("mode")
    act(() => result.current.start.generate())
    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]?.body).toEqual({
      inputs: {
        model: waveSpeed.id,
        inputImage: [photo],
        targetResolution: "4k",
        outputFormat: "jpeg",
      },
    })
  })

  it("sends the graph's tab, its well and its scale on the graph", async () => {
    const { posted, result } = renderUpscale({ image: [photo] })
    expect(result.current.hosted.chosen?.id).toBe(graph.id)
    act(() => result.current.start.generate())
    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]?.body).toMatchObject({
      inputs: { mode: "image", image: [photo], model: graph.id, scale: "2x" },
    })
    expect(posted[0]?.body).not.toHaveProperty("inputs.video")
  })
})

describe("the Upscale column", () => {
  it("shows the photo, then the model once with no caption, then the scale, with the seed closed under Advanced", () => {
    const { result } = renderUpscale({ image: [photo] })
    showColumn(<UpscalePanel state={result.current} />)
    const well = screen.getByText(tCatalog("upscale.input.image.label"))
    const model = theModelChip()
    const scale = document.querySelector(
      `[aria-label="${tCatalog("upscale.input.scale.label")}"]`
    )
    if (scale === null) {
      throw new Error("no Scale control")
    }
    expect(isBefore(well, model)).toBe(true)
    expect(isBefore(model, scale)).toBe(true)
    expect(isBefore(scale, advancedToggle())).toBe(true)
    expect(screen.queryByText(tCatalog("upscale.input.model.label"))).toBeNull()
    expect(screen.queryByText(t("field.seed.label"))).toBeNull()
  })
})
