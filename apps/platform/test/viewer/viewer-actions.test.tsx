import { type Asset, asset, type Run, run } from "@rosesfield/contract"
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
  within,
} from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { runQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { ViewerActions, ViewerBar } from "@/viewer/viewer-actions"
import { ViewerInfo } from "@/viewer/viewer-info"

const runId = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01"
const outputId = "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01"

const made: Run = run.parse({
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
  cost: null,
  origin: "demo",
  failure: null,
  createdAt: "2026-10-20T12:00:00.000Z",
  finishedAt: "2026-10-20T12:00:02.000Z",
})

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

function renderPiece(piece: () => ReactElement): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false } },
  })
  client.setQueryData(runQuery(runId).queryKey, { run: made })
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

function isFilled(element: Element): boolean {
  return element.className.split(" ").includes("bg-ink")
}

function isColoured(element: Element): boolean {
  return /\b(?:bg-bug|text-bug|text-cem|bg-cem)/.test(element.className)
}

afterEach(cleanup)

const live: Run = { ...made, origin: "live" }

function comfyMarkOf(element: Element | null): string | null | undefined {
  return element
    ?.querySelector("[data-slot=lab-mark]")
    ?.getAttribute("data-mark")
}

describe("the viewer's actions", () => {
  it("sets Recreate first, then Download and Use in, then Open in ComfyUI and Delete, with no More menu", async () => {
    renderPiece(() => (
      <ViewerActions asset={output} run={live} onDeleted={() => undefined} />
    ))
    const recreate = await screen.findByRole("button", {
      name: t("run.useInputs"),
    })
    const actions = recreate.closest("[data-slot=viewer-actions]")
    const names = within(actions as HTMLElement)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label") ?? button.textContent)
    expect(names).toEqual([
      t("run.useInputs"),
      t("output.download"),
      t("output.useIn"),
      t("run.openInComfy"),
      t("output.delete"),
    ])
    expect(screen.queryByRole("button", { name: t("viewer.more") })).toBeNull()
  })

  it("keeps Recreate the one filled control, and Open in ComfyUI a secondary button with the Comfy mark on its ink tile", async () => {
    renderPiece(() => (
      <ViewerActions asset={output} run={live} onDeleted={() => undefined} />
    ))
    await screen.findByRole("button", { name: t("run.useInputs") })
    const filled = screen.getAllByRole("button").filter(isFilled)
    const comfy = screen.getByRole("button", { name: t("run.openInComfy") })
    expect(filled.map((button) => button.textContent)).toEqual([
      t("run.useInputs"),
    ])
    expect(comfy.className.split(" ")).toContain("bg-(--well)")
    expect(comfyMarkOf(comfy)).toBe("comfy")
    expect(
      comfy.querySelector("[data-slot=lab-mark]")?.getAttribute("data-ground")
    ).toBe("mark")
  })

  it("deletes on the second press of Delete, which reads Delete once armed", async () => {
    const deleted: string[] = []
    const fetched: string[] = []
    const real = globalThis.fetch
    globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      fetched.push(`${init?.method ?? "GET"} ${String(url)}`)
      return new Response(null, { status: 204 })
    }
    renderPiece(() => (
      <ViewerActions
        asset={output}
        run={live}
        onDeleted={() => deleted.push("done")}
      />
    ))
    const remove = await screen.findByRole("button", {
      name: t("output.delete"),
    })
    fireEvent.click(remove)
    expect(remove.getAttribute("data-armed")).toBe("yes")
    expect(fetched.filter((call) => call.startsWith("DELETE"))).toEqual([])
    fireEvent.click(remove)
    await waitFor(() => expect(deleted).toEqual(["done"]))
    expect(fetched.filter((call) => call.startsWith("DELETE"))).toHaveLength(1)
    globalThis.fetch = real
  })

  it("puts Info, Recreate, Download, Use in, Open in ComfyUI and Delete on the phone bar, Recreate the one filled control", async () => {
    renderPiece(() => (
      <ViewerBar
        asset={output}
        run={live}
        onDeleted={() => undefined}
        details={null}
      />
    ))
    const recreate = await screen.findByRole("button", {
      name: t("run.useInputs"),
    })
    expect(screen.getAllByRole("button").filter(isFilled)).toEqual([recreate])
    expect(
      comfyMarkOf(screen.getByRole("button", { name: t("run.openInComfy") }))
    ).toBe("comfy")
    expect(
      screen.getByRole("button", { name: t("output.delete") })
    ).toBeTruthy()
    expect(screen.queryByRole("button", { name: t("viewer.more") })).toBeNull()
  })

  it("fills no control on the phone bar of an upload, which has no Recreate", async () => {
    renderPiece(() => (
      <ViewerBar
        asset={{ ...output, sourceRunId: null }}
        run={null}
        onDeleted={() => undefined}
        details={null}
      />
    ))
    await screen.findByRole("button", { name: t("output.download") })
    expect(screen.getAllByRole("button").filter(isFilled)).toEqual([])
    expect(
      screen.queryByRole("button", { name: t("run.useInputs") })
    ).toBeNull()
  })

  it("gives the demo caption muted ink, not a warning colour", async () => {
    renderPiece(() => (
      <ViewerInfo
        asset={output}
        compare={{
          inputId: null,
          isDemo: true,
          isOn: false,
          onToggle: () => undefined,
        }}
        measured={null}
      />
    ))
    const caption = await screen.findByText(t("run.demoCaption"))

    expect(isColoured(caption)).toBe(false)
    expect(caption.className.split(" ")).toContain("text-ink-muted")
  })
})
