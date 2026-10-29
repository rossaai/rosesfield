import { type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"
import type { AppForm } from "@/screens/app/use-app-form"
import { useMotionChain } from "@/studio/motion/use-motion-chain"

const realFetch = globalThis.fetch

const lastFrame = "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"
const endKey = "3d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"

type Sent = { url: string; key: string | null; body: unknown }

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

const clip = "6d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"
const photos = [1, 2, 3, 4].map(
  (n) => `${n}e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b`
)
const frames = [5, 6, 7, 8].map(
  (n) => `${n}f4a5b6c-7d8e-4f9a-8b1c-2d3e4f5a6b7c`
)
const ownMade = {
  plan: "7a5b6c7d-8e9f-4a0b-9c2d-3e4f5a6b7c8d",
  depth: "8b6c7d8e-9f0a-4b1c-8d3e-4f5a6b7c8d9e",
  mask: "9c7d8e9f-0a1b-4c2d-9e4f-5a6b7c8d9e0f",
  firstFrame: "0d8e9f0a-1b2c-4d3e-8f5a-6b7c8d9e0f1a",
  edited: "1e9f0a1b-2c3d-4e4f-9a6b-7c8d9e0f1a2b",
}

const keptPlan = {
  targets: [
    { find: "the man", becomes: "the man of photo 1", photos: [0] },
    { find: "his jacket", becomes: "the jacket of photo 2", photos: [1] },
    { find: "his bottle", becomes: "the bottle of photo 3", photos: [2] },
  ],
  editPrompt: "Change each thing into its photo.",
  scene: "A man walks down a street in a jacket with a bottle.",
  unusedPhotos: [3],
}

const ownHeld: Record<string, unknown[]> = {
  plan: [{ nodeId: "0", assetId: ownMade.plan, kind: "text" }],
  read: [
    { nodeId: "13", assetId: ownMade.depth, kind: "video" },
    { nodeId: "28", assetId: ownMade.mask, kind: "video" },
    { nodeId: "31", assetId: ownMade.firstFrame, kind: "image" },
  ],
  edit: [{ nodeId: "0", assetId: ownMade.edited, kind: "image" }],
  draft: [{ nodeId: "1011", assetId: lastFrame, kind: "image" }],
  restore: [{ nodeId: "0", assetId: endKey, kind: "image" }],
}

const ownStages = ["plan", "read", "edit", "draft", "restore", "final"]

function ownRunOf(stage: string, body: unknown, failAt: string | null): Run {
  const isFailed = stage === failAt
  const inputs =
    typeof body === "object" && body !== null && "inputs" in body
      ? body.inputs
      : {}
  return run.parse({
    id: `${ownStages.indexOf(stage) + 1}b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e`,
    appId: stage === "edit" || stage === "restore" ? "image" : "motion",
    status: isFailed ? "failed" : "done",
    inputs,
    count: 1,
    aspectRatio: "9:16",
    seed: 9,
    outputs: [],
    held: isFailed ? [] : (ownHeld[stage] ?? []),
    progress: 1,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: isFailed
      ? { code: "MOTION_NOTHING_TO_CHANGE", status: 400 }
      : null,
    createdAt: "2026-10-29T10:00:00.000Z",
    finishedAt: "2026-10-29T10:01:00.000Z",
  })
}

const unpriced = { source: "unknown", credits: null }

function ownGateway(
  failAt: string | null = null,
  price: { source: string; credits: number | null } = unpriced
): Sent[] {
  const sent: Sent[] = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    const body = init?.body === undefined ? null : JSON.parse(String(init.body))
    const key = new Headers(init?.headers).get("Idempotency-Key")
    if (url.endsWith("/price")) {
      return Response.json({ price })
    }
    if (init?.method === "POST") {
      sent.push({ url, key, body })
    }
    const stage = ownStages.find((one) => key?.endsWith(`-${one}`) === true)
    return stage === undefined
      ? new Response(null, { status: 404 })
      : Response.json({ run: ownRunOf(stage, body, failAt) }, { status: 202 })
  }
  return sent
}

function ownForm(): AppForm {
  return {
    problems: new Map(),
    setInput: () => undefined,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
    values: {
      inputs: {
        example: "own",
        model: "ltx-2-5-guide",
        clip: [clip],
        photo: photos,
        scene: "replace the man",
        resolution: "1080p",
      },
      seedMode: "random",
      count: 1,
      aspectRatio: null,
    },
  }
}

function renderOwn(
  failAt: string | null = null,
  price: { source: string; credits: number | null } = unpriced
) {
  const sent = ownGateway(failAt, price)
  const grabbed: string[] = []
  const hook = renderHook(
    () =>
      useMotionChain({
        example: null,
        form: ownForm(),
        clipSize: { width: 720, height: 1280 },
        frames: async (one) => {
          grabbed.push(one)
          return frames
        },
        heldText: async (assetId) =>
          assetId === ownMade.plan ? JSON.stringify(keptPlan) : "",
      }),
    { wrapper }
  )
  return { ...hook, sent, grabbed }
}

describe("your own video's chain in Motion", () => {
  it("plans, reads and edits held, drafts at 480p, waits for Make final, restores held, waits again, then renders the final at 1080p, all under one press's key", async () => {
    const { result, sent, grabbed } = renderOwn()
    expect(result.current?.start.label).toBe("Generate")
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("makeFinal"))
    expect(grabbed).toEqual([clip])
    expect(sent.map((one) => one.key?.replace(/^.*-/, ""))).toEqual([
      "plan",
      "read",
      "edit",
      "draft",
    ])
    expect(sent[0]?.body).toMatchObject({
      inputs: {
        model: "motion-plan",
        clip: [clip],
        frames,
        photo: photos,
        scene: "replace the man",
      },
      place: "held",
    })
    expect(sent[1]?.body).toMatchObject({
      inputs: {
        model: "motion-read-clip",
        targets: "the man, his jacket, his bottle",
      },
      place: "held",
    })
    expect(sent[2]?.url).toBe("/api/apps/image/runs")
    expect(sent[2]?.body).toMatchObject({ place: "held" })
    expect(sent[3]?.body).toEqual({
      inputs: expect.objectContaining({
        model: "ltx-2-5-guide",
        firstFrame: [ownMade.edited],
        guide: [ownMade.depth],
        mask: [ownMade.mask],
        resolution: "480p",
      }),
      aspectRatio: "9:16",
    })
    expect(result.current?.leftOut).toEqual({
      draftId: "4b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      photos: [3],
    })
    expect(result.current?.start.label).toBe("Make final")
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("renderFinal"))
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.stage.stage).toBe("idle"))
    expect(sent.map((one) => one.key?.replace(/^.*-/, ""))).toEqual(ownStages)
    expect(sent[5]?.body).toMatchObject({
      inputs: {
        guide: [ownMade.depth],
        resolution: "1080p",
        endKey: [endKey],
        seed: 9,
      },
    })
    expect(
      new Set(sent.map((one) => one.key?.replace(/-[a-z]+$/, "")))
    ).toEqual(new Set([sent[0]?.key?.replace(/-[a-z]+$/, "")]))
  })

  it("stops at a plan that finds nothing to change, names it with the refusal's code, starts nothing after it and keeps your inputs", async () => {
    const { result, sent } = renderOwn("plan")
    act(() => result.current?.start.generate())
    await waitFor(() => expect(result.current?.start.error).not.toBeNull())
    expect(sent).toHaveLength(1)
    expect(result.current?.stage.stage).toBe("idle")
    expect(result.current?.start.error).toMatchObject({
      code: "MOTION_NOTHING_TO_CHANGE",
    })
    expect(result.current?.leftOut).toBeNull()
  })

  it("has no chain for your own video on LTX 2.3 control, which runs in one run, the control", () => {
    const form = ownForm()
    const { result } = renderHook(
      () =>
        useMotionChain({
          example: null,
          form: {
            ...form,
            values: {
              ...form.values,
              inputs: { ...form.values.inputs, model: "ltx-2-3-control" },
            },
          },
          clipSize: { width: 720, height: 1280 },
        }),
      { wrapper }
    )
    expect(result.current).toBeNull()
  })

  it("shows on Generate the plan, the read, the edit and the draft as one price, and none while one of them is unpriced, the control", async () => {
    const priced = renderOwn(null, { source: "measured", credits: 2.5 })
    await waitFor(() =>
      expect(priced.result.current?.start.priceValue).not.toBeNull()
    )
    expect(priced.result.current?.start.priceName).toContain("10")
    priced.unmount()
    const unknown = renderOwn()
    await new Promise((done) => setTimeout(done, 50))
    expect(unknown.result.current?.start.priceValue ?? null).toBeNull()
  })
})
