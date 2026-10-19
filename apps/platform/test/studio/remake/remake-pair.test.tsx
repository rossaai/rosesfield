import { run } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { RemakePair } from "@/studio/remake/remake-pair"

const editId = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d"
const outputId = "4f506172-8394-4e0f-9a1b-3c4d5e6f7081"
const characterId = "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"

const store = vi.hoisted(() => ({
  missing: new Set<string>(),
  opened: [] as { assetId: string; list: readonly string[] }[],
}))

vi.mock("@/viewer/viewer-context", () => ({
  useViewer: () => ({
    open: (assetId: string, _origin: HTMLElement, list: readonly string[]) =>
      store.opened.push({ assetId, list }),
  }),
}))

vi.mock("@/api/queries", async (original) => ({
  ...(await original<typeof import("@/api/queries")>()),
  assetQuery: (assetId: string) => ({
    queryKey: ["asset", assetId],
    queryFn: () => {
      if (store.missing.has(assetId)) {
        throw new Error("gone")
      }
      return {
        asset: {
          id: assetId,
          kind: "video",
          width: 1280,
          height: 720,
          durationSeconds: 10,
          sourceRunId: null,
        },
      }
    },
    retry: false,
  }),
}))

vi.mock("@/api/use-asset-source", () => ({
  useAssetSource: (assetId: string) => ({
    state: "ready",
    src: `blob:${assetId}`,
  }),
}))

vi.mock("@/pieces/use-in-menu", () => ({ UseInSubmenu: () => null }))
vi.mock("@/pieces/delete-asset-dialog", () => ({
  DeleteAssetDialog: () => null,
}))
vi.mock("@/pieces/run/run-outputs", () => ({
  RunOutputs: ({ run: shown }: { run: { outputs: string[] } }) => (
    <p>{`outputs of the run: ${shown.outputs.join(", ")}`}</p>
  ),
}))

function doneRun(inputs: Record<string, unknown>) {
  return run.parse({
    id: "3f2e1d0c-9b8a-4776-a655-443322110000",
    appId: "remake",
    status: "done",
    inputs,
    count: 1,
    aspectRatio: "16:9",
    seed: 7,
    outputs: [outputId],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-17T09:00:00.000Z",
    finishedAt: "2026-10-17T09:00:03.000Z",
  })
}

function show(inputs: Record<string, unknown>): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <RemakePair run={doneRun(inputs)} outputId={outputId} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  store.missing.clear()
  store.opened.length = 0
})

describe("a finished Remake run in the canvas", () => {
  it("shows your reference and the output as tiles that play muted and loop", async () => {
    show({ reference: [editId], character: [characterId] })
    await waitFor(() =>
      expect(document.querySelectorAll("video")).toHaveLength(2)
    )
    for (const video of document.querySelectorAll("video")) {
      expect(video.loop).toBe(true)
      expect(video.muted).toBe(true)
    }
    expect(
      [...document.querySelectorAll("video")].map((video) => video.src)
    ).toEqual([`blob:${editId}`, `blob:${outputId}`])
  })

  it("opens each side in the viewer, where the output's sound plays", async () => {
    show({ reference: [editId], character: [characterId] })
    await waitFor(() =>
      expect(document.querySelectorAll("video")).toHaveLength(2)
    )
    const tiles = document.querySelectorAll<HTMLElement>(
      "button[data-slot='media-tile']"
    )
    expect(tiles).toHaveLength(2)
    for (const tile of tiles) {
      fireEvent.click(tile)
    }
    expect(store.opened).toEqual([
      { assetId: editId, list: [editId] },
      { assetId: outputId, list: [outputId] },
    ])
  })

  it("offers Try again when your reference no longer loads, and still shows the output", async () => {
    store.missing.add(editId)
    show({ reference: [editId], character: [characterId] })
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: t("state.tryAgain") })
      ).toBeDefined()
    )
    expect(document.querySelectorAll("video")).toHaveLength(1)
  })

  it("falls back to the run's outputs when the run holds no reference", () => {
    show({ character: [characterId] })
    expect(screen.getByText(`outputs of the run: ${outputId}`)).toBeDefined()
    expect(document.querySelectorAll("video")).toHaveLength(0)
  })
})
