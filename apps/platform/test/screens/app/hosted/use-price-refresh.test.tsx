import { type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { usePriceRefresh } from "@/screens/app/hosted/use-price-refresh"

afterEach(cleanup)

function runOf(status: Run["status"]): Run {
  return run.parse({
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e01",
    appId: "image",
    status,
    inputs: { model: "maker/picture-2", prompt: "a door" },
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: status === "done" ? ["0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"] : [],
    progress: null,
    engine: { adapter: "comfy-router", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T09:00:00.000Z",
    finishedAt: status === "done" ? "2026-10-19T09:00:20.000Z" : null,
  })
}

describe("usePriceRefresh", () => {
  it("asks the app's prices again once a run of the app is done", () => {
    const client = new QueryClient()
    const key = ["price", "image", "valid", { inputs: { prompt: "a door" } }]
    client.setQueryData(key, { price: { source: "unknown", credits: null } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { rerender } = renderHook(
      ({ runs }: { runs: Run[] }) => usePriceRefresh("image", runs),
      { wrapper, initialProps: { runs: [runOf("running")] } }
    )
    expect(client.getQueryState(key)?.isInvalidated).toBe(false)
    rerender({ runs: [runOf("done")] })
    expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  })
})
