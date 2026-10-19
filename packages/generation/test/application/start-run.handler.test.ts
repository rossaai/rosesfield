import { run as runSchema } from "@rosesfield/contract"
import { appIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { selectBinding } from "#domain/select-binding"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { imageApp } from "../sample"
import { harnessFor, startImage } from "./harness"

const prompt = "a red door in fog"

function startWith(
  harness: ReturnType<typeof harnessFor>,
  overrides: Partial<{
    appId: string
    body: unknown
    idempotencyKey: string | null
    seed: number | null
  }>
) {
  return harness.start.execute({
    appId: "sample-image",
    body: { inputs: { prompt } },
    idempotencyKey: null,
    seed: null,
    ...overrides,
  })
}

describe("StartRunHandler", () => {
  it("stores a queued run with the defaults of the app and watches it", async () => {
    const harness = harnessFor()
    const { run } = await startWith(harness, {})
    expect(runSchema.parse(run)).toEqual(run)
    expect(run).toMatchObject({
      appId: "sample-image",
      status: "queued",
      inputs: { prompt, model: "open", references: [], character: [] },
      count: 1,
      aspectRatio: "1:1",
      origin: "live",
      engine: { adapter: "fake-engine" },
    })
    expect(harness.jobs.enqueued).toEqual([run.id])
    expect((await harness.runs.get(run.id))?.status).toBe("queued")
  })

  it("refuses an app the catalog does not hold", async () => {
    await expect(
      startWith(harnessFor(), { appId: "missing" })
    ).rejects.toMatchObject({
      code: "APP_NOT_FOUND",
      status: 404,
    })
  })

  it("refuses a body that breaks the app's rules and names each field", async () => {
    const harness = harnessFor()
    const error = await startWith(harness, {
      body: { inputs: { prompt: " ", model: "best" } },
    }).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ code: "RUN_INPUT_INVALID", status: 400 })
    expect(String(error)).toContain("inputs.prompt")
    expect(String(error)).toContain("inputs.model")
    expect(harness.jobs.enqueued).toEqual([])
  })

  it("keeps a fixed seed and picks one in bounds when the seed is random", async () => {
    const harness = harnessFor()
    const fixed = await startImage(harness, { inputs: { prompt, seed: 7 } })
    const random = await startImage(harness)
    expect((await harness.get.execute({ runId: fixed })).run.seed).toBe(7)
    const seed = (await harness.get.execute({ runId: random })).run.seed
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThanOrEqual(2_147_483_647)
  })

  it("uses the given seed when the inputs leave the seed random", async () => {
    const { run } = await startWith(harnessFor(), { seed: 99 })
    expect(run.seed).toBe(99)
  })

  it("records no seed for an app that takes none", async () => {
    const app = { ...imageApp(), inputs: imageApp().inputs.slice(0, 1) }
    const { run } = await startWith(harnessFor({ apps: [app] }), {})
    expect(run.seed).toBeNull()
  })

  it("returns the first run again for a repeated idempotency key", async () => {
    const harness = harnessFor()
    const first = await startWith(harness, { idempotencyKey: "turn-1-tool-2" })
    const second = await startWith(harness, { idempotencyKey: "turn-1-tool-2" })
    expect(second.run.id).toBe(first.run.id)
    expect(harness.jobs.enqueued).toEqual([first.run.id])
  })

  it.each(["", "has space", "x".repeat(256)])(
    "refuses the idempotency key %j",
    async (idempotencyKey) => {
      await expect(
        startWith(harnessFor(), { idempotencyKey })
      ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_INVALID", status: 400 })
    }
  )

  it("refuses a key that started a run of another app", async () => {
    const other = { ...imageApp(), id: appIdFormat.parse("other-image") }
    const harness = harnessFor({ apps: [imageApp(), other] })
    await startWith(harness, { idempotencyKey: "key-1" })
    await expect(
      startWith(harness, { appId: "other-image", idempotencyKey: "key-1" })
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", status: 409 })
  })

  it("picks the engine of the model the inputs choose", async () => {
    const binding = selectBinding({
      input: "model",
      options: {
        open: { adapter: "engine-open", config: {} },
        hosted: { adapter: "engine-hosted", config: {} },
      },
    })
    const harness = harnessFor({
      apps: [imageApp(binding)],
      engines: [
        new FakeGenerationEngine({ key: "engine-open" }),
        new FakeGenerationEngine({ key: "engine-hosted", origin: "demo" }),
      ],
    })
    const { run } = await startWith(harness, {
      body: { inputs: { prompt, model: "hosted" } },
    })
    expect(run.engine.adapter).toBe("engine-hosted")
    expect(run.origin).toBe("demo")
  })

  it("refuses an app no engine on the server runs", async () => {
    const app = imageApp({ adapter: "elsewhere", config: {} })
    await expect(
      startWith(harnessFor({ apps: [app] }), {})
    ).rejects.toMatchObject({ code: "ENGINE_BINDING_INVALID", status: 412 })
  })
})
