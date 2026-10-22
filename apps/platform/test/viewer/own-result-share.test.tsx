import {
  type Asset,
  asset,
  type Run,
  run,
  type ShareView,
} from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { runQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { ViewerActions, ViewerBar } from "@/viewer/viewer-actions"

const runId = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01"
const outputId = "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01"
const shareId = "sh-own-1"

const finished: Run = run.parse({
  id: runId,
  appId: "image",
  status: "done",
  inputs: { prompt: "a red kite over a green field" },
  count: 1,
  aspectRatio: "1:1",
  seed: 1,
  outputs: [outputId],
  progress: 1,
  engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
  cost: { amount: 0.006, currency: "USD" },
  origin: "live",
  failure: null,
  createdAt: "2026-10-20T12:00:00.000Z",
  finishedAt: "2026-10-20T12:00:02.000Z",
})

const running: Run = {
  ...finished,
  status: "running",
  outputs: [],
  progress: 0.5,
  finishedAt: null,
}

const output: Asset = asset.parse({
  id: outputId,
  kind: "image",
  mime: "image/png",
  bytes: 1024,
  width: 512,
  height: 512,
  durationSeconds: null,
  sourceRunId: runId,
  createdAt: "2026-10-20T12:00:02.000Z",
})

const shared: ShareView = {
  id: shareId,
  path: `/share/${shareId}`,
  run: finished,
  media: [
    {
      index: 0,
      kind: "image",
      mime: "image/png",
      width: 512,
      height: 512,
      durationSeconds: null,
    },
  ],
  createdAt: "2026-10-20T12:00:10.000Z",
  expiresAt: null,
}

function renderPiece(piece: () => ReactElement, shown: Run): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false } },
  })
  client.setQueryData(runQuery(runId).queryKey, { run: shown })
  const root = createRootRoute({
    component: () => (
      <ToastProvider>
        <TooltipProvider>
          {piece()}
          <Outlet />
        </TooltipProvider>
      </ToastProvider>
    ),
  })
  const page = createRoute({
    getParentRoute: () => root,
    path: "$",
    component: () => null,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/history"] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

function labelOf(element: Element): string {
  return element.getAttribute("aria-label") ?? element.textContent ?? ""
}

async function moreItems(): Promise<string[]> {
  fireEvent.click(await screen.findByRole("button", { name: t("viewer.more") }))
  return (await screen.findAllByRole("menuitem")).map(labelOf)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("sharing a person's own result from the viewer", () => {
  it("sets Share first in More for a finished run, and Share posts the share and shows its link", async () => {
    const fetched = vi.fn(async () =>
      Response.json({ share: shared }, { status: 201 })
    )
    vi.stubGlobal("fetch", fetched)
    renderPiece(
      () => (
        <ViewerActions
          asset={output}
          run={finished}
          onDeleted={() => undefined}
        />
      ),
      finished
    )
    expect(await moreItems()).toEqual([t("share.title"), t("output.delete")])
    fireEvent.click(screen.getByRole("menuitem", { name: t("share.title") }))
    const link = new URL(shared.path, window.location.origin).href
    await waitFor(() => expect(screen.getByText(link)).toBeTruthy())
    expect(fetched).toHaveBeenCalledWith(
      `/api/runs/${runId}/share`,
      expect.objectContaining({ method: "POST" })
    )
  })

  it("offers Share in the compact bar's More too", async () => {
    renderPiece(
      () => (
        <ViewerBar
          asset={output}
          run={finished}
          onDeleted={() => undefined}
          details={null}
        />
      ),
      finished
    )
    expect(await moreItems()).toContain(t("share.title"))
  })

  it("control: a run that is not done offers only Delete", async () => {
    renderPiece(
      () => (
        <ViewerActions
          asset={output}
          run={running}
          onDeleted={() => undefined}
        />
      ),
      running
    )
    expect(await moreItems()).toEqual([t("output.delete")])
  })
})
