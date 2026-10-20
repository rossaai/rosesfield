import { asset, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, render, waitFor } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { assetQuery, runQuery } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"

const assetId = "1b2c3d4e-5f60-4718-9a2b-3c4d5e6f7a80"

const runId = "93e9078d-0000-4000-8000-000000000001"

const app = findCatalogApp("video")

type Seeds = { use: string | undefined; from: string | undefined }

function clientWithRecords(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
  })
  client.setQueryData(assetQuery(assetId).queryKey, {
    asset: asset.parse({
      id: assetId,
      kind: "image",
      mime: "image/png",
      bytes: 10,
      width: 2,
      height: 2,
      durationSeconds: null,
      sourceRunId: null,
      createdAt: "2026-10-19T10:00:00.000Z",
    }),
  })
  client.setQueryData(runQuery(runId).queryKey, {
    run: run.parse({
      id: runId,
      appId: "video",
      status: "done",
      inputs: { prompt: "a door" },
      count: 1,
      aspectRatio: null,
      seed: null,
      outputs: [],
      progress: null,
      engine: { adapter: "demo", models: [], workflowHash: null },
      cost: null,
      origin: "demo",
      failure: null,
      createdAt: "2026-10-19T10:00:00.000Z",
      finishedAt: "2026-10-19T10:00:03.000Z",
    }),
  })
  return client
}

async function sourceOf(seeds: Seeds): Promise<AppForm["source"]> {
  if (app === null) {
    throw new Error("no video app")
  }
  const seen: AppForm[] = []
  function Probe(): ReactElement | null {
    if (app !== null) {
      seen.push(useAppForm(app, seeds))
    }
    return null
  }
  const router = createRouter({
    routeTree: createRootRoute({ component: Probe }),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={clientWithRecords()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await waitFor(() => {
    const inputs = seen.at(-1)?.values.inputs ?? {}
    expect(
      inputs.prompt === "a door" ||
        (Array.isArray(inputs.startFrame) &&
          inputs.startFrame.includes(assetId))
    ).toBe(true)
  })
  return seen.at(-1)?.source
}

afterEach(cleanup)

describe("the source of an app's opening values", () => {
  it("stays on the defaults when the app opens with an asset to use", async () => {
    expect(await sourceOf({ use: assetId, from: undefined })).toBe("defaults")
  })

  it("is the seed when the app reopens a run from History", async () => {
    expect(await sourceOf({ use: undefined, from: runId })).toBe("seed")
  })
})
