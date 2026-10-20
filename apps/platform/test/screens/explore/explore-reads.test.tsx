import { type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  exploreReads,
  useExploreEntries,
} from "@/screens/explore/explore-entries"
import {
  type ExploreAdmission,
  exploreListQuery,
} from "@/screens/explore/explore-list"

const oldId = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01"
const newId = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e02"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function runOf(id: string): Run {
  return run.parse({
    id,
    appId: "image",
    status: "done",
    inputs: { prompt: "a red rose" },
    count: 1,
    aspectRatio: "1:1",
    seed: 1,
    outputs: ["3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01"],
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: { amount: 0.006, currency: "USD" },
    origin: "live",
    failure: null,
    createdAt: "2026-10-01T12:00:00.000Z",
    finishedAt: "2026-10-01T12:00:05.000Z",
  })
}

function admissionOf(runId: string): ExploreAdmission {
  return {
    runId,
    source: "own-open-weights",
    yes: "2026-10-20",
    people: "none",
    brand: false,
  }
}

function pathOf(input: unknown): string {
  return typeof input === "string" ? input : String(input)
}

function bodyOf(path: string): unknown {
  if (path.startsWith("/api/runs/")) {
    return { run: runOf(path.slice("/api/runs/".length)) }
  }
  if (path.startsWith("/api/runs")) {
    return { runs: [runOf(newId)], next: "older" }
  }
  return { shares: [] }
}

function jsonOf(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

describe("Explore's reads", () => {
  it("read each admitted run by its id, however many newer runs you made", async () => {
    const requested: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const path = pathOf(input)
        requested.push(path)
        return jsonOf(bodyOf(path))
      })
    )
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(exploreListQuery.queryKey, [admissionOf(oldId)])
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useExploreEntries(), { wrapper })

    await waitFor(() => expect(result.current.state).toBe("ready"))
    const entries =
      result.current.state === "ready" ? result.current.entries : []
    expect(entries.map((entry) => entry.run.id)).toEqual([oldId])
    expect(requested).toEqual([`/api/runs/${oldId}`])
  })

  it("grow with the Explore list and read a share by the id it names", () => {
    expect(exploreReads([])).toEqual({ runIds: [], shareIds: [] })
    expect(
      exploreReads([
        admissionOf(oldId),
        { ...admissionOf(newId), shareId: "abc" },
        admissionOf(oldId),
      ])
    ).toEqual({ runIds: [oldId, newId], shareIds: ["abc"] })
  })
})
