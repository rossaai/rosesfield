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
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assetQuery, runQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { RunCard } from "@/screens/agent/run-card"

const runId = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e22"
const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c22"

const made: Run = run.parse({
  id: runId,
  appId: "image",
  status: "done",
  inputs: { prompt: "a red bicycle on a white wall", model: "auto" },
  count: 1,
  aspectRatio: "3:4",
  seed: 7,
  outputs: [assetId],
  progress: null,
  engine: { adapter: "comfy", models: [], workflowHash: "abc" },
  cost: null,
  origin: "live",
  failure: null,
  createdAt: "2026-10-17T09:00:00.000Z",
  finishedAt: "2026-10-17T09:00:03.000Z",
})

const picture: Asset = asset.parse({
  id: assetId,
  kind: "image",
  mime: "image/png",
  bytes: 3_000,
  width: 768,
  height: 1024,
  durationSeconds: null,
  sourceRunId: runId,
  createdAt: "2026-10-17T09:00:03.000Z",
})

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("a run in an agent conversation", () => {
  it("shows its media first with its facts as badges over it, and no prompt, seed or caption above it", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(runQuery(runId).queryKey, { run: made })
    client.setQueryData(assetQuery(assetId).queryKey, { asset: picture })
    const router = createRouter({
      routeTree: createRootRoute({
        component: () => (
          <ToastProvider>
            <TooltipProvider>
              <RunCard runId={runId} />
            </TooltipProvider>
          </ToastProvider>
        ),
      }),
      history: createMemoryHistory({ initialEntries: ["/agent"] }),
    })
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
    const card = await screen.findByRole("article")
    const row = card.querySelector("[data-slot=output-row]")
    expect(card.firstElementChild).toBe(row)
    expect(row?.querySelector("[data-slot=media-chrome-facts]")).not.toBeNull()
    expect(card.textContent).not.toContain("a red bicycle")
    expect(card.textContent).not.toContain(t("field.seed.label"))
    expect(card.querySelector("h3")).toBeNull()
    const open = screen.getByText(t("agent.run.open")).closest("a")
    expect(open?.getAttribute("href")).toBe(`/history/${runId}`)
  })
})
