import { type Asset, asset, type Run, run } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { columnsOf, RunCard, RunColumns } from "@/pieces/run/run-card"

const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c11"

function runOf(change: Partial<Record<keyof Run, unknown>>): Run {
  return run.parse({
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e11",
    appId: "video",
    status: "done",
    inputs: { prompt: "a dancer turning in a narrow street", model: "auto" },
    count: 1,
    aspectRatio: "16:9",
    seed: 7,
    outputs: [assetId],
    progress: null,
    engine: {
      adapter: "comfy",
      models: ["video/ltx-2.5-dev.safetensors"],
      workflowHash: "abc",
    },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-17T09:00:00.000Z",
    finishedAt: "2026-10-17T09:00:03.000Z",
    ...change,
  })
}

function videoOf(size: { width: number | null; height: number | null }): Asset {
  return asset.parse({
    id: assetId,
    kind: "video",
    mime: "video/mp4",
    bytes: 3_000_000,
    ...size,
    durationSeconds: 5,
    sourceRunId: null,
    createdAt: "2026-10-17T09:00:03.000Z",
  })
}

function renderWith(client: QueryClient, children: ReactNode): void {
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ToastProvider>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/apps/video"] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

function clientWith(held: Asset): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(assetQuery(assetId).queryKey, { asset: held })
  return client
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("a run on an app page", () => {
  it("shows its media first, with its facts and its prompt over the media and no caption line above it", async () => {
    const client = clientWith(videoOf({ width: 1080, height: 1920 }))
    renderWith(
      client,
      <RunCard run={runOf({})} onUseInputs={() => undefined} />
    )
    const card = await screen.findByRole("article")
    const row = card.querySelector("[data-slot=output-row]")
    expect(card.firstElementChild).toBe(row)
    const facts = row?.querySelector("[data-slot=run-facts]")
    expect(
      [...(facts?.querySelectorAll("[data-slot=media-badge]") ?? [])].map(
        (badge) => badge.textContent
      )
    ).toEqual(["ltx-2.5-dev", t("run.made", { duration: "3 seconds" })])
    expect(facts?.className).toContain("group-hover/reveal:opacity-100")
    expect(facts?.className).toContain("group-focus-within/reveal:opacity-100")
    expect(row?.querySelector("[data-slot=run-prompt]")?.textContent).toBe(
      "a dancer turning in a narrow street"
    )
    expect(card.textContent).not.toContain(t("run.price.unknown"))
    expect(card.querySelector("[data-slot=media-tile-caption]")).toBeNull()
  })

  it("marks a demo run with the Demo engine badge over its media", async () => {
    const client = clientWith(videoOf({ width: 1920, height: 1080 }))
    renderWith(client, <RunCard run={runOf({ origin: "demo" })} />)
    const facts = await vi.waitFor(() => {
      const found = document.querySelector("[data-slot=run-facts]")
      if (found === null) {
        throw new Error("no facts")
      }
      return found
    })
    expect(facts.textContent).toContain(t("run.demoCaption"))
  })

  it("lays out the runs in two columns from the regular width and in one below it", () => {
    render(
      <RunColumns>
        <span />
      </RunColumns>
    )
    const columns = document.querySelector("[data-slot=run-columns]")
    expect(columns?.className).toContain("grid-cols-1")
    expect(columns?.className).toContain("@regular:grid-cols-2")
  })
})

describe("the runs of an app page on desktop", () => {
  it("pack into two column stacks, newest first across them, so a tall run leaves no gap beside it", () => {
    render(
      <RunColumns>
        {["first", "second", "third", "fourth"].map((name) => (
          <span key={name}>{name}</span>
        ))}
      </RunColumns>
    )
    const stacks = [...document.querySelectorAll("[data-slot=run-column]")]
    expect(stacks.map((stack) => stack.textContent)).toEqual([
      "firstthird",
      "secondfourth",
    ])
    const places = [...document.querySelectorAll<HTMLElement>("[style]")].map(
      (place) => [place.textContent, place.style.getPropertyValue("--place")]
    )
    expect(places).toEqual([
      ["first", "0"],
      ["third", "2"],
      ["second", "1"],
      ["fourth", "3"],
    ])
  })

  it("puts each run in the shorter column, so a tall run's neighbour column takes the next runs", () => {
    expect(columnsOf(4, [1.78, 1, 1, 1])).toEqual([0, 1, 1, 0])
    expect(columnsOf(3, undefined)).toEqual([0, 1, 0])
  })

  it("lets a run's media fill its column, and keeps the canvas height cap on a phone", async () => {
    const client = clientWith(videoOf({ width: 1080, height: 1920 }))
    renderWith(
      client,
      <RunColumns>
        <RunCard key="tall" run={runOf({})} />
      </RunColumns>
    )
    const card = await screen.findByRole("article")
    const row = card.querySelector<HTMLElement>("[data-slot=output-row]")
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining(["max-w-(--row-max)", "@regular:max-w-none"])
    )
    expect(row?.style.maxWidth).toBe("")
    expect(row?.style.getPropertyValue("--row-max")).toMatch(/\* 0\.5625\)$/)
  })
})

describe("a run stored with no shape", () => {
  it("takes its shape from the media once the media loads, and keeps it for every tile", async () => {
    vi.stubGlobal("fetch", () => new Promise(() => undefined))
    const client = clientWith(videoOf({ width: null, height: null }))
    renderWith(client, <RunCard run={runOf({})} />)
    const video = await vi.waitFor(() => {
      const found = document.querySelector("video")
      if (found === null) {
        throw new Error("no video")
      }
      return found
    })
    expect(video.getAttribute("preload")).toBe("metadata")
    Object.defineProperty(video, "videoWidth", { value: 1080 })
    Object.defineProperty(video, "videoHeight", { value: 1920 })
    fireEvent.loadedMetadata(video)
    await vi.waitFor(() =>
      expect(
        client.getQueryData(assetQuery(assetId).queryKey)?.asset
      ).toMatchObject({ width: 1080, height: 1920 })
    )
    await vi.waitFor(() =>
      expect(
        document.querySelector<HTMLElement>("[data-slot=media-tile]")?.style
          .aspectRatio
      ).toBe("1080 / 1920")
    )
  })
})
