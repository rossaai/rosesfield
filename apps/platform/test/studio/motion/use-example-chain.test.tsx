import { exampleOf } from "@rosesfield/catalog/motion"
import { type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  finalPriceOf,
  useExampleChain,
} from "@/studio/motion/use-example-chain"

const realFetch = globalThis.fetch

const photo = "5d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"
const lastFrame = "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"
const endKey = "3d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"

type Sent = { url: string; key: string | null; body: unknown }

function runOf(stage: string, body: unknown): Run {
  const inputs =
    typeof body === "object" && body !== null && "inputs" in body
      ? body.inputs
      : {}
  return run.parse({
    id: `${stage === "draft" ? 1 : stage === "restore" ? 2 : 3}a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d`,
    appId: stage === "restore" ? "image" : "motion",
    status: "done",
    inputs,
    count: 1,
    aspectRatio: "2:3",
    seed: 9,
    outputs: [],
    held:
      stage === "draft"
        ? [{ nodeId: "1011", assetId: lastFrame, kind: "image" }]
        : stage === "restore"
          ? [{ nodeId: "0", assetId: endKey, kind: "image" }]
          : [],
    progress: 1,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-29T10:00:00.000Z",
    finishedAt: "2026-10-29T10:01:00.000Z",
  })
}

function gateway(): Sent[] {
  const sent: Sent[] = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    const body = init?.body === undefined ? null : JSON.parse(String(init.body))
    const key = new Headers(init?.headers).get("Idempotency-Key")
    if (url.endsWith("/price")) {
      return Response.json({ price: { source: "unknown", credits: null } })
    }
    if (init?.method === "POST") {
      sent.push({ url, key, body })
    }
    const stage = ["draft", "restore", "final"].find(
      (one) => key?.endsWith(`-${one}`) === true
    )
    return stage === undefined
      ? new Response(null, { status: 404 })
      : Response.json({ run: runOf(stage, body) }, { status: 202 })
  }
  return sent
}

function formWith(resolution: string): AppForm {
  return {
    values: {
      inputs: { photo: [photo], resolution },
      seedMode: "random",
      count: 1,
      aspectRatio: null,
    },
    problems: new Map(),
    setInput: () => undefined,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  )
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe("a guided example's chain in Motion", () => {
  it("drafts at 480p, waits for Make final, restores the last frame held, waits again, then renders the final at 1080p with the end key", async () => {
    const sent = gateway()
    const example = exampleOf("grab-and-run")
    const { result } = renderHook(
      () => useExampleChain(example, formWith("1080p")),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    expect(sent).toHaveLength(1)
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("renderFinal"))
    expect(result.current?.start.label).toBe("Render the final at 1080p")
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("idle"))
    expect(sent.map((one) => one.url)).toEqual([
      "/api/apps/motion/runs",
      "/api/apps/image/runs",
      "/api/apps/motion/runs",
    ])
    expect(sent[0]?.body).toMatchObject({
      inputs: { example: "grab-and-run", resolution: "480p" },
      aspectRatio: "2:3",
    })
    expect(sent[1]?.body).toMatchObject({ place: "held" })
    expect(sent[2]?.body).toMatchObject({
      inputs: { resolution: "1080p", endKey: [endKey], seed: 9 },
    })
  })

  it("starts nothing past the draft until you press Make final, the control", async () => {
    const sent = gateway()
    const { result } = renderHook(
      () => useExampleChain(exampleOf("grab-and-run"), formWith("720p")),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    expect(sent).toHaveLength(1)
    expect(result.current?.start.label).toBe("Make final")
  })

  it("has no chain for an example with no guide", () => {
    const { result } = renderHook(
      () => useExampleChain(exampleOf("push-into-eye"), formWith("720p")),
      { wrapper }
    )
    expect(result.current).toBeNull()
  })
})

describe("the final's price", () => {
  const example = exampleOf("grab-and-run")

  it("names the example's measured 16.79 credits at 1080p until your own run measures it", () => {
    expect(finalPriceOf(null, example, "1080p")).toEqual({
      credits: 16.79,
      kept: true,
    })
    expect(finalPriceOf(12, example, "1080p")).toEqual({
      credits: 12,
      kept: false,
    })
  })

  it("names no price at a resolution the example has no run of, the control", () => {
    expect(finalPriceOf(null, example, "720p")).toEqual({
      credits: null,
      kept: false,
    })
  })
})
