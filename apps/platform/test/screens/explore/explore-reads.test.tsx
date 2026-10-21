import { type Run, run, type ShareView } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  type ExploreEntries,
  exploreShares,
  useExploreEntries,
} from "@/screens/explore/explore-entries"
import {
  type ExploreAdmission,
  exploreListQuery,
} from "@/screens/explore/explore-list"

const liveId = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01"
const expiredId = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e02"

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

function shareOf(shareId: string, runId: string): ShareView {
  return {
    id: shareId,
    path: `/share/${shareId}`,
    run: runOf(runId),
    media: [
      {
        index: 0,
        kind: "image",
        mime: "image/png",
        width: 1024,
        height: 1024,
        durationSeconds: null,
      },
    ],
    createdAt: "2026-10-01T12:00:10.000Z",
    expiresAt: null,
  }
}

function admissionOf(runId: string, shareId: string): ExploreAdmission {
  return {
    runId,
    shareId,
    source: "own-open-weights",
    yes: "2026-10-20",
    people: "none",
    brand: false,
  }
}

function pathOf(input: unknown): string {
  return typeof input === "string" ? input : String(input)
}

function jsonOf(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function expired(): Response {
  return jsonOf(404, { error: { code: "SHARE_NOT_FOUND", status: 404 } })
}

function readExplore(
  list: readonly ExploreAdmission[],
  answer: (path: string) => Promise<Response>
): { requested: string[]; result: { current: ExploreEntries } } {
  const requested: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const path = pathOf(input)
      requested.push(path)
      return answer(path)
    })
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(exploreListQuery.queryKey, list)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useExploreEntries(), { wrapper })
  return { requested, result }
}

function idsOf(entries: ExploreEntries): string[] {
  return entries.state === "ready"
    ? entries.entries.map((entry) => entry.run.id)
    : []
}

describe("Explore's reads", () => {
  it("read only the share each entry names, and drop the entry whose share expired", async () => {
    const { requested, result } = readExplore(
      [admissionOf(liveId, "live"), admissionOf(expiredId, "gone")],
      async (path) =>
        path === "/share/live/data"
          ? jsonOf(200, { share: shareOf("live", liveId) })
          : expired()
    )
    await waitFor(() => expect(result.current.state).toBe("ready"))
    expect(idsOf(result.current)).toEqual([liveId])
    expect(requested.sort()).toEqual(["/share/gone/data", "/share/live/data"])
  })

  it("show an empty list, not a failure, when every share expired", async () => {
    const { result } = readExplore([admissionOf(expiredId, "gone")], async () =>
      expired()
    )
    await waitFor(() => expect(result.current.state).toBe("ready"))
    expect(idsOf(result.current)).toEqual([])
  })

  it("show the failure when no share loads for another reason than being gone", async () => {
    const { result } = readExplore(
      [admissionOf(liveId, "live"), admissionOf(expiredId, "gone")],
      async (path) =>
        path === "/share/live/data"
          ? jsonOf(502, { error: { code: "DEPENDENCY_FAILED", status: 502 } })
          : expired()
    )
    await waitFor(() => expect(result.current.state).toBe("failed"))
  })

  it("show the failure when the gateway answers no read", async () => {
    const { result } = readExplore([admissionOf(liveId, "live")], async () => {
      throw new TypeError("offline")
    })
    await waitFor(() => expect(result.current.state).toBe("failed"))
  })

  it("grow with the Explore list, one read per share", () => {
    expect(exploreShares([])).toEqual([])
    expect(
      exploreShares([
        admissionOf(liveId, "abc"),
        admissionOf(expiredId, "def"),
        admissionOf(liveId, "abc"),
      ])
    ).toEqual(["abc", "def"])
  })
})
