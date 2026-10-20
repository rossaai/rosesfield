import { type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { runPrice } from "@/pieces/run/run-facts"
import type { VisualEntry } from "@/screens/explore/explore-tile"
import { ResultPanel } from "@/viewer/result-panel"

const inputId = "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"
const outputId = "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01"

function runOf(change: Partial<Record<keyof Run, unknown>>): Run {
  return run.parse({
    id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
    appId: "image",
    status: "done",
    inputs: { prompt: "a red rose in rain" },
    count: 1,
    aspectRatio: "1:1",
    seed: 1,
    outputs: [outputId],
    progress: 1,
    engine: {
      adapter: "comfy-workflow",
      models: ["model-a.safetensors"],
      workflowHash: null,
    },
    cost: { amount: 0.006, currency: "USD" },
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T12:00:00.000Z",
    finishedAt: "2026-10-19T12:00:05.000Z",
    ...change,
  })
}

function entryOf(made: Run, shared = false): VisualEntry {
  return {
    key: `run-${made.id}`,
    run: made,
    kind: "image",
    aspect: { width: 1, height: 1 },
    source: shared
      ? { kind: "share", shareId: "abc", src: "/share/abc/media/0" }
      : { kind: "own", assetId: outputId },
  }
}

function Frame({ children }: { children: ReactElement }): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { enabled: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function renderPanel(entry: VisualEntry) {
  const onRecreate = vi.fn()
  const onDownload = vi.fn()
  const view = render(
    <Frame>
      <ResultPanel
        entry={entry}
        isDownloading={false}
        onRecreate={onRecreate}
        onDownload={onDownload}
      />
    </Frame>
  )
  return { ...view, onRecreate, onDownload }
}

afterEach(cleanup)

describe("the result viewer's panel", () => {
  it("lists the prompt, the model and the credits as detail rows", () => {
    const entry = entryOf(runOf({}))
    const { container } = renderPanel(entry)
    const details = container.querySelector("[data-slot=viewer-details]")

    expect(details?.textContent).toContain("a red rose in rain")
    expect(details?.textContent).toContain("model-a")
    expect(details?.textContent).toContain(runPrice(entry.run))
    expect(screen.getByText(t("explore.viewer.credits"))).toBeTruthy()
  })

  it("shows each input asset as a tile, and none for a shared result", () => {
    const made = runOf({
      appId: "background-removal",
      inputs: { image: [inputId], background: "transparent" },
    })
    const own = renderPanel(entryOf(made))
    const tiles = own.container.querySelectorAll(
      "[data-slot=viewer-inputs] .size-18"
    )
    expect(tiles).toHaveLength(1)
    own.unmount()

    const stripped = runOf({
      appId: "background-removal",
      inputs: { image: [] },
    })
    const shared = renderPanel(entryOf(stripped, true))
    expect(
      shared.container.querySelector("[data-slot=viewer-inputs]")
    ).toBeNull()
  })

  it("says in its head that the result is machine generated", () => {
    const { container } = renderPanel(entryOf(runOf({})))
    const head = container.querySelector("[data-slot=viewer-head]")

    expect(head?.textContent).toContain(t("explore.tile.machineMade"))
  })

  it("puts Recreate above Download, each calling its own act", () => {
    const { onRecreate, onDownload } = renderPanel(entryOf(runOf({})))
    const recreate = screen.getByRole("button", {
      name: t("explore.viewer.recreate"),
    })
    const download = screen.getByRole("button", {
      name: t("output.download"),
    })

    expect(
      recreate.compareDocumentPosition(download) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    fireEvent.click(recreate)
    expect(onRecreate).toHaveBeenCalledTimes(1)
    expect(onDownload).not.toHaveBeenCalled()
    fireEvent.click(download)
    expect(onDownload).toHaveBeenCalledTimes(1)
  })
})
