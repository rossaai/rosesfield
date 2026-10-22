import { run } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
import { RemakePair } from "@/studio/remake/remake-pair"
import type { RemakePlan } from "@/studio/remake/remake-plan"
import { planOfThree } from "./remake-fixtures"

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
    retryOnMount: false,
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

async function show(
  inputs: Record<string, unknown>,
  assets: readonly string[],
  plan: RemakePlan | null = null
): Promise<void> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  await Promise.all(assets.map((id) => client.prefetchQuery(assetQuery(id))))
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <RemakePair run={doneRun(inputs)} outputId={outputId} plan={plan} />
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
    await show({ reference: [editId], character: [characterId] }, [
      editId,
      outputId,
    ])
    expect(document.querySelectorAll("video")).toHaveLength(2)
    for (const video of document.querySelectorAll("video")) {
      expect(video.loop).toBe(true)
      expect(video.muted).toBe(true)
    }
    expect(
      [...document.querySelectorAll("video")].map((video) => video.src)
    ).toEqual([`blob:${editId}#t=0.1`, `blob:${outputId}#t=0.1`])
  })

  it("opens each side in the viewer, where the output's sound plays", async () => {
    await show({ reference: [editId], character: [characterId] }, [
      editId,
      outputId,
    ])
    expect(document.querySelectorAll("video")).toHaveLength(2)
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
    await show({ reference: [editId], character: [characterId] }, [
      editId,
      outputId,
    ])
    expect(
      screen.getByRole("button", { name: t("state.tryAgain") })
    ).toBeDefined()
    expect(document.querySelectorAll("video")).toHaveLength(1)
  })

  it("falls back to the run's outputs when the run holds no reference", async () => {
    await show({ character: [characterId] }, [])
    expect(screen.getByText(`outputs of the run: ${outputId}`)).toBeDefined()
    expect(document.querySelectorAll("video")).toHaveLength(0)
  })
})

type Clock = { at: number; plays: number }

function watchVideos(): Clock[] {
  return [...document.querySelectorAll("video")].map((video) => {
    const clock: Clock = { at: 0, plays: 0 }
    Object.defineProperty(video, "currentTime", {
      get: () => clock.at,
      set: (value: number) => {
        clock.at = value
      },
    })
    Object.defineProperty(video, "play", {
      value: () => {
        clock.plays += 1
        return Promise.resolve()
      },
    })
    Object.defineProperty(video, "pause", { value: () => undefined })
    return clock
  })
}

describe("a finished Remake run with its plan", () => {
  const both = { reference: [editId], character: [characterId] }

  it("marks the cuts on one timeline under both videos", async () => {
    await show(both, [editId, outputId], planOfThree)
    const timelines = document.querySelectorAll("[data-slot='shot-timeline']")
    expect(timelines).toHaveLength(1)
    expect(document.querySelectorAll("[data-slot='cut']")).toHaveLength(2)
  })

  it("moves both videos to the start of a shot when you press its number, and plays both from there", async () => {
    await show(both, [editId, outputId], planOfThree)
    const clocks = watchVideos()
    expect(clocks).toHaveLength(2)
    fireEvent.click(
      screen.getByRole("button", {
        name: tCatalog("remake.plan.shot", { number: 2 }),
      })
    )
    expect(clocks.map((clock) => clock.at)).toEqual([4, 4])
    fireEvent.click(
      screen.getByRole("button", { name: tCatalog("remake.compare.play") })
    )
    expect(clocks.map((clock) => clock.at)).toEqual([4, 4])
    expect(clocks.map((clock) => clock.plays)).toEqual([1, 1])
  })

  it("lists each shot in the info panel with its span, its route, its model, its credits and its seed, and a rebuilt shot's words and camera move", async () => {
    await show(both, [editId, outputId], planOfThree)
    fireEvent.click(screen.getByRole("button", { name: t("viewer.info") }))
    const shots = [...document.querySelectorAll("[data-slot='shot-detail']")]
    expect(shots).toHaveLength(3)
    const [replaced, rebuilt, kept] = shots.map((shot) => shot.textContent)
    expect(replaced).toContain(tCatalog("remake.route.replace"))
    expect(replaced).toContain(t("model.tag.length", { min: "0", max: "4" }))
    expect(replaced).toContain("LTX 2.3 control")
    expect(replaced).toContain(t("run.price.credits", { amount: "8" }))
    expect(replaced).toContain(`${t("viewer.label.seed")}7`)
    expect(replaced).not.toContain(t("viewer.label.prompt"))
    expect(rebuilt).toContain(tCatalog("remake.route.rebuild"))
    expect(rebuilt).toContain("A wide street at dusk.")
    expect(rebuilt).toContain(tCatalog("video.choice.cameraMove.pushIn"))
    expect(rebuilt).toContain(`${t("viewer.label.seed")}8`)
    expect(kept).toContain(tCatalog("remake.route.keep"))
    expect(kept).not.toContain(t("viewer.label.model"))
  })

  it("control: shows no timeline and no info panel for a run with no plan", async () => {
    await show(both, [editId, outputId])
    expect(document.querySelector("[data-slot='shot-timeline']")).toBeNull()
    expect(screen.queryByRole("button", { name: t("viewer.info") })).toBeNull()
  })
})
