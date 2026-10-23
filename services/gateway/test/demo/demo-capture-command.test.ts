import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { captureOptionsOf } from "../../../../scripts/demo/demo-args"
import { DemoHost } from "../../../../scripts/demo/demo-host"

const command = fileURLToPath(
  new URL("../../../../scripts/demo/capture.ts", import.meta.url)
)

const key = "comfyui-demo-capture-test-key"

const photoId = "0b6c3f4e-1d2a-4c5b-9e8f-7a6b5c4d3e2f"
const outputId = "1c7d4a5f-2e3b-4d6c-8f9a-8b7c6d5e4f3a"
const kept = "2d8e5b6a-3f4c-4e7d-9a0b-9c8d7e6f5a4b"
const older = "3e9f6c7b-4a5d-4f8e-8b1c-0d9e8f7a6b5c"
const demo = "4fa07d8c-5b6e-4a9f-9c2d-1e0f9a8b7c6d"
const failed = "5ab18e9d-6c7f-4b0a-8d3e-2f1a0b9c8d7e"

type FakeRun = {
  id: string
  status: string
  origin: string
  createdAt: string
}

function runRow(run: FakeRun): Record<string, unknown> {
  return {
    id: run.id,
    appId: "effects",
    status: run.status,
    inputs: { effect: "push-into-eye", image: [photoId] },
    count: 1,
    aspectRatio: "3:4",
    seed: 1028487189,
    outputs: run.status === "done" ? [outputId] : [],
    progress: null,
    engine: { adapter: "comfy-cloud", models: [], workflowHash: "2221d4e0" },
    cost: run.status === "done" ? { amount: 0.18, currency: "USD" } : null,
    origin: run.origin,
    failure: null,
    createdAt: run.createdAt,
    finishedAt: run.createdAt,
  }
}

const runs = [
  {
    id: demo,
    status: "done",
    origin: "demo",
    createdAt: "2026-10-22T10:00:00Z",
  },
  {
    id: failed,
    status: "failed",
    origin: "live",
    createdAt: "2026-10-22T09:00:00Z",
  },
  {
    id: kept,
    status: "done",
    origin: "live",
    createdAt: "2026-10-22T08:00:00Z",
  },
  {
    id: older,
    status: "done",
    origin: "live",
    createdAt: "2026-10-21T08:00:00Z",
  },
].map(runRow)

function hostAnswer(mode: string, request: Request): Response {
  if (request.headers.get("x-engine-key") !== key) {
    return Response.json({ error: { code: "KEY_REQUIRED" } }, { status: 401 })
  }
  const { pathname } = new URL(request.url)
  if (pathname === "/api/settings") {
    return Response.json({ settings: { mode, lock: "none" } })
  }
  if (pathname === "/api/account") {
    return Response.json({
      account: { key: "valid", credits: 2490.5, retentionDays: 30, cap: null },
    })
  }
  if (pathname === `/api/runs/${kept}/share` && request.method === "POST") {
    return Response.json(
      {
        share: {
          id: "Zq3Ftb8mVwq1J0aXrN4u2A",
          path: "/share/Zq3Ftb8mVwq1J0aXrN4u2A",
        },
      },
      { status: 201 }
    )
  }
  if (pathname === "/api/runs") {
    return Response.json({ runs, next: null })
  }
  const run = runs.find((one) => pathname === `/api/runs/${one.id}`)
  if (run !== undefined) {
    return Response.json({ run })
  }
  if (pathname === `/api/assets/${photoId}`) {
    return Response.json({
      asset: { id: photoId, kind: "image", mime: "image/png" },
    })
  }
  return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
}

function serve(mode: string): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (request) => hostAnswer(mode, request),
  })
}

let publicHost: ReturnType<typeof Bun.serve>
let ownerHost: ReturnType<typeof Bun.serve>

beforeAll(() => {
  publicHost = serve("public")
  ownerHost = serve("owner")
})

afterAll(async () => {
  await Promise.all([publicHost.stop(true), ownerHost.stop(true)])
})

async function capture(
  args: string[],
  env: Record<string, string> = { DEMO_KEY: key }
): Promise<{ code: number; out: string; error: string }> {
  const rest = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => name !== "DEMO_KEY" && name !== "DEMO_URL"
    )
  )
  const done = Bun.spawn(["bun", command, ...args], {
    env: { ...rest, ...env },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [out, error, code] = await Promise.all([
    new Response(done.stdout).text(),
    new Response(done.stderr).text(),
    done.exited,
  ])
  return { code, out, error }
}

function planned(out: string): Record<string, unknown> {
  return JSON.parse(out)
}

describe("bun run demo:capture --plan", () => {
  it("opens on the latest finished live Effects run, passing a demo run and a failed run, inside the demo's 200 credits", async () => {
    const done = await capture(["--plan", "--url", publicHost.url.origin])

    expect(done.error).toBe("")
    expect(done.code).toBe(0)
    const plan = planned(done.out)
    expect(plan.url).toBe(publicHost.url.origin)
    expect(plan.run).toBe(kept)
    expect(plan.apps).toEqual([{ appId: "effects", runId: kept }])
    expect(plan.budget).toBe(200)
    expect(plan.live).toBe(false)
    expect(plan.graph).toBe("effects-ltx-2-5")
    expect(plan.proof).toMatchObject({ runs: expect.any(Number) })
    expect(done.out).not.toContain(key)
  })

  it("takes the run you name, and refuses a demo run, because every result comes from a real run", async () => {
    const named = await capture([
      "--plan",
      "--url",
      publicHost.url.origin,
      "--run",
      older,
    ])
    const refused = await capture([
      "--plan",
      "--url",
      publicHost.url.origin,
      "--run",
      demo,
    ])

    expect(planned(named.out).run).toBe(older)
    expect(refused.code).toBe(1)
    expect(refused.error).toContain(
      `Run ${demo} is not a finished live effects run`
    )
  })

  it("lowers the live budget to the credits you name and refuses more than 200", async () => {
    const lower = await capture([
      "--plan",
      "--live",
      "--budget",
      "150",
      "--url",
      publicHost.url.origin,
    ])
    const higher = await capture([
      "--plan",
      "--live",
      "--budget",
      "201",
      "--url",
      publicHost.url.origin,
    ])

    expect(planned(lower.out)).toMatchObject({ live: true, budget: 150 })
    expect(higher.code).toBe(1)
    expect(higher.error).toContain("at most 200")
  })

  it("refuses a site that is not in public mode, since the video shows the key being connected", async () => {
    const done = await capture(["--plan", "--url", ownerHost.url.origin])

    expect(done.code).toBe(1)
    expect(done.error).toContain("runs in owner mode")
  })

  it("asks for DEMO_KEY and never prints the key it reads", async () => {
    const missing = await capture(
      ["--plan", "--url", publicHost.url.origin],
      {}
    )
    const wrong = await capture(["--plan", "--url", publicHost.url.origin], {
      DEMO_KEY: "comfyui-not-this-one",
    })

    expect(missing.code).toBe(1)
    expect(missing.error).toContain("Set DEMO_KEY")
    expect(wrong.code).toBe(1)
    expect(wrong.error).not.toContain("comfyui-not-this-one")
  })

  it("records DEMO_URL, and rosesfield.com when none is named", async () => {
    const fromEnv = await capture(["--plan"], {
      DEMO_KEY: key,
      DEMO_URL: publicHost.url.origin,
    })
    const fallback = captureOptionsOf(
      [],
      { DEMO_KEY: key },
      new Date("2026-10-22T12:00:00Z")
    )

    expect(planned(fromEnv.out).url).toBe(publicHost.url.origin)
    expect(fallback.url).toBe("https://rosesfield.com")
  })

  it("prints the 2000 credits the live runs keep on the balance", async () => {
    const done = await capture([
      "--plan",
      "--live",
      "--url",
      publicHost.url.origin,
    ])

    expect(planned(done.out)).toMatchObject({
      live: true,
      budget: 200,
      reserve: 2000,
    })
  })
})

describe("the Share scene's link", () => {
  it("asks the site to share the run with your key and takes the link it answers", async () => {
    const host = new DemoHost({ url: publicHost.url.origin, key })

    expect(await host.share(kept)).toBe("/share/Zq3Ftb8mVwq1J0aXrN4u2A")
  })

  it("stops when the site shares no link for the run", async () => {
    const host = new DemoHost({ url: publicHost.url.origin, key })

    await expect(host.share(older)).rejects.toThrow("answered 404")
  })
})
