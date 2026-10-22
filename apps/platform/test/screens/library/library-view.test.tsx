import { asset, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { LibraryRows } from "@/screens/library/library-rows"
import { libraryLayout, libraryShownOf } from "@/screens/library/library-screen"

const runId = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01"

const made = run.parse({
  id: runId,
  appId: "image",
  status: "done",
  inputs: { prompt: "a red door in fog" },
  count: 1,
  aspectRatio: "1:1",
  seed: 1,
  outputs: ["3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01"],
  progress: 1,
  engine: { adapter: "demo", models: [], workflowHash: null },
  cost: null,
  origin: "demo",
  failure: null,
  createdAt: "2026-10-21T12:00:00.000Z",
  finishedAt: "2026-10-21T12:00:03.000Z",
})

function assetOf(id: string, sourceRunId: string | null) {
  return asset.parse({
    id,
    kind: "image",
    mime: "image/png",
    bytes: 1000,
    width: 64,
    height: 64,
    durationSeconds: null,
    sourceRunId,
    createdAt: "2026-10-21T12:00:03.000Z",
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Library's View", () => {
  it("opens on Grid, which shows the masonry, and List shows rows, so the chosen tab names what shows", () => {
    expect(libraryLayout).toBe("grid")
    expect(libraryShownOf("grid", null)).toBe("masonry")
    expect(libraryShownOf("list", null)).toBe("rows")
    expect(libraryShownOf("grid", [])).toBe("tiles")
  })

  it("lists each item as a row with its picture, the app or Upload, and the run's prompt", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LibraryRows
          size={0}
          assets={[
            assetOf("3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01", runId),
            assetOf("4e5f6a7b-8c9d-4e0f-9a1b-3c4d5e6f7a02", null),
          ]}
          runsById={new Map([[runId, made]])}
        />
      </QueryClientProvider>
    )
    const rows = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(rows).toHaveLength(2)
    expect(rows[0]?.textContent).toContain("a red door in fog")
    expect(rows[1]?.textContent).toContain(t("library.upload"))
  })
})
