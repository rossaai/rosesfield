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
import { cleanup, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { runQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { ViewerActions, ViewerBar, ViewerManage } from "@/viewer/viewer-actions"
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

describe("the viewer's actions", () => {
  it("puts Recreate over Download and Use in, a pair that closes the foot", async () => {
    renderPiece(() => <ViewerActions asset={output} run={made} />)
    const recreate = await screen.findByRole("button", {
      name: t("run.useInputs"),
    })
    const foot = recreate.closest("[data-slot=viewer-foot]")
    const pair = foot?.querySelector("[data-slot=viewer-foot-pair]")
    const names = [...(pair?.querySelectorAll("button") ?? [])].map(
      (button) => button.textContent
    )

    expect(names).toEqual([t("output.download"), t("output.useIn")])
    expect(foot?.lastElementChild).toBe(pair)
    expect(
      recreate.compareDocumentPosition(pair as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(foot?.textContent).not.toContain(t("output.delete"))
  })

  it("keeps Recreate the one filled control, and Delete quiet", async () => {
    renderPiece(() => (
      <>
        <ViewerManage asset={output} run={made} onDeleted={() => undefined} />
        <ViewerActions asset={output} run={made} />
      </>
    ))
    const buttons = await screen.findAllByRole("button")
    const filled = buttons.filter(isFilled)
    const remove = screen.getByRole("button", { name: t("output.delete") })

    expect(filled.map((button) => button.textContent)).toEqual([
      t("run.useInputs"),
    ])
    expect(isColoured(remove)).toBe(false)
    expect(remove.className.split(" ")).toContain("bg-transparent")
    expect(buttons.some(isColoured)).toBe(false)
  })

  it("shows Recreate on the phone bar as its one filled control", async () => {
    renderPiece(() => (
      <ViewerBar
        asset={output}
        run={made}
        onDeleted={() => undefined}
        details={null}
      />
    ))
    const recreate = await screen.findByRole("button", {
      name: t("run.useInputs"),
    })
    const filled = screen.getAllByRole("button").filter(isFilled)

    expect(filled).toEqual([recreate])
    expect(
      screen.getByRole("button", { name: t("output.download") })
    ).toBeTruthy()
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
    const download = await screen.findByRole("button", {
      name: t("output.download"),
    })

    expect(download.textContent).toBe(t("output.download"))
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
        onDeleted={() => undefined}
      />
    ))
    const caption = await screen.findByText(t("run.demoCaption"))

    expect(isColoured(caption)).toBe(false)
    expect(caption.className.split(" ")).toContain("text-ink-muted")
  })
})
