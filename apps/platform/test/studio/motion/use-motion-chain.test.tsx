import { exampleOf } from "@rosesfield/catalog/motion"
import { type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"
import type { AppForm } from "@/screens/app/use-app-form"
import { useMotionChain } from "@/studio/motion/use-motion-chain"

const realFetch = globalThis.fetch

const photo = "5d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"
const lastFrame = "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"
const endKey = "3d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"

type Sent = { url: string; key: string | null; body: unknown }

type Fakes = {
  failDraft?: boolean
  price?: { source: string; credits: number | null }
}

function runOf(stage: string, body: unknown, fakes: Fakes = {}): Run {
  const isFailed = stage === "draft" && fakes.failDraft === true
  const inputs =
    typeof body === "object" && body !== null && "inputs" in body
      ? body.inputs
      : {}
  return run.parse({
    id: `${stage === "draft" ? 1 : stage === "restore" ? 2 : 3}a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d`,
    appId: stage === "restore" ? "image" : "motion",
    status: isFailed ? "failed" : "done",
    inputs,
    count: 1,
    aspectRatio: "2:3",
    seed: 9,
    outputs: [],
    held: isFailed
      ? []
      : stage === "draft"
        ? [{ nodeId: "1011", assetId: lastFrame, kind: "image" }]
        : stage === "restore"
          ? [{ nodeId: "0", assetId: endKey, kind: "image" }]
          : [],
    progress: 1,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: isFailed ? { code: "RUN_FAILED", status: 502 } : null,
    createdAt: "2026-10-29T10:00:00.000Z",
    finishedAt: "2026-10-29T10:01:00.000Z",
  })
}

function gateway(fakes: Fakes = {}): Sent[] {
  const sent: Sent[] = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    const body = init?.body === undefined ? null : JSON.parse(String(init.body))
    const key = new Headers(init?.headers).get("Idempotency-Key")
    if (url.endsWith("/price")) {
      return Response.json({
        price: fakes.price ?? { source: "unknown", credits: null },
      })
    }
    if (init?.method === "POST") {
      sent.push({ url, key, body })
    }
    const stage = ["draft", "restore", "final"].find(
      (one) => key?.endsWith(`-${one}`) === true
    )
    return stage === undefined
      ? new Response(null, { status: 404 })
      : Response.json({ run: runOf(stage, body, fakes) }, { status: 202 })
  }
  return sent
}

function formWith(resolution: string, seed: number | null = null): AppForm {
  return {
    values: {
      inputs:
        seed === null
          ? { photo: [photo], resolution }
          : { photo: [photo], resolution, seed },
      seedMode: seed === null ? "random" : "fixed",
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
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  globalThis.fetch = realFetch
})

describe("a guided example's chain in Motion", () => {
  it("drafts at 480p, waits for Make final, restores the last frame held, waits again, then renders the final at 1080p with the end key", async () => {
    const sent = gateway()
    const example = exampleOf("grab-and-run")
    const { result } = renderHook(
      () =>
        useMotionChain({
          example: example,
          form: formWith("1080p"),
          clipSize: null,
        }),
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

  it("drafts on the seed you set", async () => {
    const sent = gateway()
    const { result } = renderHook(
      () =>
        useMotionChain({
          example: exampleOf("grab-and-run"),
          form: formWith("1080p", 20261028),
          clipSize: null,
        }),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    expect(sent[0]?.body).toMatchObject({
      inputs: { example: "grab-and-run", resolution: "480p", seed: 20261028 },
    })
  })

  it("starts nothing past the draft until you press Make final, the control", async () => {
    const sent = gateway()
    const { result } = renderHook(
      () =>
        useMotionChain({
          example: exampleOf("grab-and-run"),
          form: formWith("720p"),
          clipSize: null,
        }),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    expect(sent).toHaveLength(1)
    expect(result.current?.start.label).toBe("Make final")
  })

  it("has no chain for an example with no guide", () => {
    const { result } = renderHook(
      () =>
        useMotionChain({
          example: exampleOf("push-into-eye"),
          form: formWith("720p"),
          clipSize: null,
        }),
      { wrapper }
    )
    expect(result.current).toBeNull()
  })
})

describe("a failure or Start over in the chain", () => {
  it("starts a new draft under a new key after a failed draft, and offers Start over", async () => {
    const sent = gateway({ failDraft: true })
    const { result } = renderHook(
      () =>
        useMotionChain({
          example: exampleOf("grab-and-run"),
          form: formWith("1080p"),
          clipSize: null,
        }),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.start.error).not.toBeNull())
    expect(result.current?.stage.stage).toBe("idle")
    expect(result.current?.canStartOver).toBe(true)
    act(() => result.current?.start.generate())
    await waitFor(() => expect(sent).toHaveLength(2))
    const [first, second] = sent.map((one) => one.key)
    expect(first).toMatch(/-draft$/)
    expect(second).toMatch(/-draft$/)
    expect(second).not.toBe(first)
  })

  it("drops the chain on Start over, so the next Generate drafts again under a new key", async () => {
    const sent = gateway()
    const { result } = renderHook(
      () =>
        useMotionChain({
          example: exampleOf("grab-and-run"),
          form: formWith("1080p"),
          clipSize: null,
        }),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    expect(result.current?.canStartOver).toBe(true)
    act(() => result.current?.startOver())
    expect(result.current?.stage.stage).toBe("idle")
    expect(result.current?.canStartOver).toBe(false)
    act(() => result.current?.start.generate())
    await waitFor(() => expect(sent).toHaveLength(2))
    expect(sent.map((one) => one.url)).toEqual([
      "/api/apps/motion/runs",
      "/api/apps/motion/runs",
    ])
    expect(sent[1]?.key).not.toBe(sent[0]?.key)
  })

  it("keeps the same key while the chain moves on without a failure, the control", async () => {
    const sent = gateway()
    const { result } = renderHook(
      () =>
        useMotionChain({
          example: exampleOf("grab-and-run"),
          form: formWith("1080p"),
          clipSize: null,
        }),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("renderFinal"))
    const keys = sent.map((one) => one.key?.replace(/-(draft|restore)$/, ""))
    expect(new Set(keys).size).toBe(1)
  })
})

describe("the final's price and the words under the button", () => {
  const example = exampleOf("grab-and-run")

  it("shows Generate on the example as its draft at 19.89 credits, the costliest measured run of its graph for a 4-second clip at 480p, when no run of yours prices it", async () => {
    gateway({ price: { source: "unknown", credits: null } })
    const { result } = renderHook(
      () =>
        useMotionChain({
          example,
          form: formWith("720p"),
          clipSize: null,
        }),
      { wrapper }
    )
    await waitFor(() =>
      expect(result.current?.priceNote).toBe(
        "19.89 Comfy credits, what measured runs cost for a 4-second clip at 480p"
      )
    )
    expect(result.current?.start.priceValue).not.toBeNull()
  })

  it("shows 21.49 credits measured for a 4-second clip at 720p, in visible words, before the second yes", async () => {
    gateway({ price: { source: "estimate", credits: 20 } })
    const { result } = renderHook(
      () =>
        useMotionChain({
          example: example,
          form: formWith("720p"),
          clipSize: null,
        }),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("renderFinal"))
    await waitFor(() =>
      expect(result.current?.priceNote).toBe(
        "21.49 Comfy credits, what measured runs cost for a 4-second clip at 720p"
      )
    )
  })

  it("shows Make final as the restore measured at 10.86 and the final measured at 21.49 for 4 seconds at 720p when no run of yours prices them", async () => {
    gateway({ price: { source: "unknown", credits: null } })
    const { result } = renderHook(
      () =>
        useMotionChain({
          example,
          form: formWith("720p"),
          clipSize: null,
        }),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    await waitFor(() =>
      expect(result.current?.priceNote).toBe(
        "32.35 Comfy credits, what measured runs cost for a 4-second clip at 720p"
      )
    )
    expect(result.current?.start.priceValue).not.toBeNull()
  })

  it("shows Make final at 1080p as the restore at 10.86 and the final measured at 51.66 with its end key, over the route's estimate", async () => {
    gateway({ price: { source: "estimate", credits: 20 } })
    const { result } = renderHook(
      () =>
        useMotionChain({
          example,
          form: formWith("1080p"),
          clipSize: null,
        }),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    await waitFor(() =>
      expect(result.current?.priceNote).toBe(
        "62.52 Comfy credits, what measured runs cost for a 4-second clip at 1080p"
      )
    )
  })

  it("names Make final at 480p an estimate, since no final with its end key was measured at 480p", async () => {
    gateway({ price: { source: "estimate", credits: 9 } })
    const { result } = renderHook(
      () =>
        useMotionChain({
          example,
          form: formWith("480p"),
          clipSize: null,
        }),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    await waitFor(() =>
      expect(result.current?.priceNote).toBe("19.86 Comfy credits, estimated")
    )
  })

  it("shows no price on Make final at 480p, which no final with its end key measured, rather than the restore alone", async () => {
    gateway({ price: { source: "unknown", credits: null } })
    const { result } = renderHook(
      () =>
        useMotionChain({
          example,
          form: formWith("480p"),
          clipSize: null,
        }),
      { wrapper }
    )
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    await new Promise((done) => setTimeout(done, 50))
    expect(result.current?.priceNote).toBeNull()
    expect(result.current?.start.priceValue ?? null).toBeNull()
  })
})
