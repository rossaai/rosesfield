import { adsPromptOf } from "@rosesfield/catalog/ads"
import { type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { VisualEntry } from "@/screens/explore/explore-tile"
import { ResultPanel } from "@/viewer/result-panel"

const outputId = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c01"
const productId = "8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d12"
const headline = "Fresh cold brew"
const line = "Made in small batches every morning"

function adsRun(inputs: Record<string, unknown>): Run {
  return run.parse({
    id: "9c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e23",
    appId: "ads",
    status: "done",
    inputs: { product: [productId], ...inputs },
    count: 1,
    aspectRatio: "1:1",
    seed: 3,
    outputs: [outputId],
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-21T12:00:00.000Z",
    finishedAt: "2026-10-21T12:00:40.000Z",
  })
}

function Frame({ children }: { children: ReactElement }): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { enabled: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function detailsOf(made: Run): string {
  const entry: VisualEntry = {
    key: `run-${made.id}`,
    run: made,
    kind: "image",
    aspect: { width: 1, height: 1 },
    source: { kind: "own", assetId: outputId },
  }
  const { container } = render(
    <Frame>
      <ResultPanel
        entry={entry}
        isDownloading={false}
        onRecreate={vi.fn()}
        onDownload={vi.fn()}
      />
    </Frame>
  )
  return (
    container.querySelector("[data-slot=viewer-details]")?.textContent ?? ""
  )
}

afterEach(cleanup)

describe("the prompt an Ads run shows in History", () => {
  it("quotes the headline and the second line as you wrote them", () => {
    const made = adsRun({ kind: "ad", headline, line })
    const text = detailsOf(made)
    expect(text).toContain(adsPromptOf(made.inputs))
    expect(text).toContain(`"${headline}`)
    expect(text).toContain(`${line}"`)
  })

  it.each([
    "studio",
    "lifestyle",
    "outdoor",
    "flat-lay",
    "minimal",
    "bold",
  ])("shows the whole prompt of a %s run, not only its scene", (style) => {
    const made = adsRun({ style, scene: "on a desk." })
    const text = detailsOf(made)
    expect(text).toContain(adsPromptOf(made.inputs))
  })
})
