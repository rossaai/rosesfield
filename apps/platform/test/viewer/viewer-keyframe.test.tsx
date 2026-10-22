import {
  type Asset,
  asset,
  character,
  type Run,
  run,
} from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { characterQuery, runQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
import { ViewerDetails } from "@/viewer/viewer-info"

const runId = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a01"
const characterId = "4c6e8a0c-2e4a-4b6c-9d0e-6a8c0e2a4c6e"
const outputs = [
  "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
]
const look = "late afternoon light"
const scenes = ["a girl opens a bakery door", "she kneads dough"]

function storyboardRun(extra: Record<string, unknown>): Run {
  return run.parse({
    id: runId,
    appId: "storyboard",
    status: "done",
    inputs: {
      sceneCount: "2",
      scene1: scenes[0],
      scene2: scenes[1],
      look,
      ...extra,
    },
    count: 2,
    aspectRatio: "16:9",
    seed: 7,
    outputs,
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-20T12:00:00.000Z",
    finishedAt: "2026-10-20T12:00:20.000Z",
  })
}

function keyframeAsset(assetId: string): Asset {
  return asset.parse({
    id: assetId,
    kind: "image",
    mime: "image/png",
    bytes: 1024,
    width: 1024,
    height: 576,
    durationSeconds: null,
    sourceRunId: runId,
    createdAt: "2026-10-20T12:00:20.000Z",
  })
}

function openDetails(made: Run, assetId: string): void {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(runQuery(runId).queryKey, { run: made })
  client.setQueryData(characterQuery(characterId).queryKey, {
    character: character.parse({
      id: characterId,
      name: "Mia",
      references: [outputs[0]],
      notes: "",
      createdAt: "2026-10-19T12:00:00.000Z",
    }),
  })
  const root = createRootRoute({
    component: () => (
      <ViewerDetails
        asset={keyframeAsset(assetId)}
        compare={{
          inputId: null,
          isDemo: false,
          isOn: false,
          onToggle: () => undefined,
        }}
        measured={null}
      />
    ),
  })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

function detailOf(label: string): string | null {
  const term = screen
    .queryAllByText(label)
    .find((element) => element.tagName === "DT")
  return term?.nextElementSibling?.textContent ?? null
}

afterEach(cleanup)

describe("the viewer's info panel for a Storyboard keyframe", () => {
  it("names keyframe 1 as the anchor of keyframe 2 when the run has no reference and no character", async () => {
    openDetails(storyboardRun({}), outputs[1] ?? "")
    await screen.findByText(t("viewer.label.prompt"))
    expect(
      detailOf(tCatalog("storyboard.keyframe.number", { number: 2 }))
    ).toBe(tCatalog("storyboard.anchor.keyframe"))
  })

  it("shows no price row for a run with no known cost", async () => {
    openDetails(storyboardRun({}), outputs[1] ?? "")
    await screen.findByText(t("viewer.label.prompt"))
    expect(detailOf(t("viewer.label.price"))).toBeNull()
    expect(screen.queryByText(t("viewer.label.price"))).toBeNull()
  })

  it("shows the keyframe's own scene and then the look as its prompt", async () => {
    openDetails(storyboardRun({}), outputs[1] ?? "")
    await screen.findByText(t("viewer.label.prompt"))
    expect(detailOf(t("viewer.label.prompt"))).toBe(`${scenes[1]} ${look}`)
  })

  it("names no anchor for keyframe 1 made from its scene", async () => {
    openDetails(storyboardRun({}), outputs[0] ?? "")
    await screen.findByText(t("viewer.label.prompt"))
    expect(
      detailOf(tCatalog("storyboard.keyframe.number", { number: 1 }))
    ).toBeNull()
    expect(detailOf(t("viewer.label.prompt"))).toBe(`${scenes[0]} ${look}`)
  })

  it("names the character as the anchor of every keyframe", async () => {
    for (const [index, assetId] of outputs.entries()) {
      openDetails(storyboardRun({ character: [characterId] }), assetId)
      const label = tCatalog("storyboard.keyframe.number", {
        number: index + 1,
      })
      await screen.findByText("Mia")
      expect(detailOf(label)).toBe("Mia")
      expect(screen.getAllByText("Mia")).toHaveLength(1)
      cleanup()
    }
  })
})
