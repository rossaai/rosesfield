import { appIdFormat, type RunId, runIdFormat } from "@rosesfield/kernel"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { describe, expect, it } from "vitest"
import { RunConflictError } from "#domain/error/run-conflict.error"
import { RunFailedError } from "#domain/error/run-failed.error"
import { Run } from "#domain/run"
import type { RunRepository } from "#domain/run.repository"
import { migrateRunTable } from "#infrastructure/bun-sqlite-run-migration"
import { DrizzleRunRepository } from "#infrastructure/drizzle-run-repository"
import { FakeRunRepository } from "../fake/fake-run-repository"
import { portraitId, start } from "../sample"

const subjects: { name: string; create: () => RunRepository }[] = [
  { name: "the fake repository", create: () => new FakeRunRepository() },
  {
    name: "the drizzle repository over bun:sqlite",
    create: () => {
      const db = drizzle(":memory:")
      migrateRunTable(db)
      return new DrizzleRunRepository({ db })
    },
  },
]

function runAt(
  seconds: number,
  options: { appId?: string; key?: string | null; id?: string } = {}
): Run {
  return Run.queue({
    id: runIdFormat.parse(options.id ?? crypto.randomUUID()),
    appId: appIdFormat.parse(options.appId ?? "sample-image"),
    request: {
      inputs: { prompt: "a red door", references: [portraitId] },
      count: 1,
      aspectRatio: "1:1",
    },
    seed: 42,
    adapter: "fake-engine",
    origin: "demo",
    idempotencyKey: options.key ?? null,
    now: new Date(start.getTime() + seconds * 1000),
  })
}

describe.each(subjects)("RunRepository contract: $name", ({ create }) => {
  it("stores a run and returns every field it was given", async () => {
    const runs = create()
    const run = runAt(0)
    run.submitted({
      index: 0,
      ref: "job-1",
      models: ["model-a"],
      workflowHash: "ab",
    })
    const stored = await runs.add(run)
    expect(stored.version).toBe(1)
    const read = await runs.get(run.id)
    expect(read?.toState()).toEqual(stored.toState())
  })

  it("keeps every job of a run with one job per output", async () => {
    const runs = create()
    const run = Run.queue({
      id: runIdFormat.parse(crypto.randomUUID()),
      appId: appIdFormat.parse("sample-image"),
      request: { inputs: { prompt: "a door" }, count: 3, aspectRatio: null },
      seed: 2_147_483_646,
      adapter: "fake-engine",
      origin: "live",
      idempotencyKey: null,
      now: start,
      outputsPerJob: "one",
    })
    run.submitting(1)
    run.submitted({ index: 2, ref: "job-3", models: [], workflowHash: null })
    run.keepJob({ index: 2, outputs: [portraitId], now: start })
    const stored = await runs.add(run)
    const read = await runs.get(run.id)
    expect(read?.toState()).toEqual(stored.toState())
    expect(read?.jobs.map((job) => [job.seed, job.status, job.ref])).toEqual([
      [2_147_483_646, "pending", null],
      [2_147_483_647, "submitting", null],
      [0, "done", "job-3"],
    ])
  })

  it("keeps a failure, an end time and outputs through a save", async () => {
    const runs = create()
    const stored = await runs.add(runAt(0))
    stored.fail({ error: new RunFailedError({}), now: start })
    const saved = await runs.save(stored)
    expect(saved.version).toBe(2)
    expect((await runs.get(stored.id))?.toRecord()).toMatchObject({
      status: "failed",
      failure: { code: "RUN_FAILED", status: 502 },
      finishedAt: start.toISOString(),
    })
  })

  it("refuses a save of a run that changed since it was read", async () => {
    const runs = create()
    const stored = await runs.add(runAt(0))
    const first = await runs.get(stored.id)
    const second = await runs.get(stored.id)
    if (first === null || second === null) {
      throw new Error("the run was not stored")
    }
    first.cancel({ now: start })
    await runs.save(first)
    second.observe({ index: 0, state: "running", progress: 0.5 })
    await expect(runs.save(second)).rejects.toThrow(RunConflictError)
    expect((await runs.get(stored.id))?.status).toBe("cancelled")
  })

  it("refuses a second run with the same id or idempotency key", async () => {
    const runs = create()
    const run = await runs.add(runAt(0, { key: "turn-1" }))
    await expect(runs.add(runAt(1, { id: run.id }))).rejects.toThrow(
      RunConflictError
    )
    await expect(runs.add(runAt(1, { key: "turn-1" }))).rejects.toThrow(
      RunConflictError
    )
    expect((await runs.findByIdempotencyKey("turn-1"))?.id).toBe(run.id)
    expect(await runs.findByIdempotencyKey("turn-2")).toBeNull()
  })

  it("returns null for a run it does not hold", async () => {
    expect(
      await create().get(runIdFormat.parse(crypto.randomUUID()))
    ).toBeNull()
  })

  it("lists newest first, by app, and before a cursor", async () => {
    const runs = create()
    const ids: RunId[] = []
    const rows: [number, string][] = [
      [0, "sample-image"],
      [1, "sample-audio"],
      [2, "sample-image"],
      [3, "sample-image"],
    ]
    for (const [seconds, appId] of rows) {
      ids.push((await runs.add(runAt(seconds, { appId }))).id)
    }
    const all = await runs.list({ appId: null, before: null, limit: 10 })
    expect(all.map((run) => run.id)).toEqual([...ids].reverse())
    const images = await runs.list({
      appId: appIdFormat.parse("sample-image"),
      before: null,
      limit: 2,
    })
    expect(images.map((run) => run.id)).toEqual([ids[3], ids[2]])
    const third = all[1]
    if (third === undefined) {
      throw new Error("the list is short")
    }
    const older = await runs.list({
      appId: null,
      before: { createdAt: third.createdAt, id: third.id },
      limit: 10,
    })
    expect(older.map((run) => run.id)).toEqual([ids[1], ids[0]])
  })

  it("lists the runs that have not finished, oldest first", async () => {
    const runs = create()
    const first = await runs.add(runAt(0))
    const done = await runs.add(runAt(1))
    const last = await runs.add(runAt(2))
    done.keepJob({ index: 0, outputs: [portraitId], now: start })
    await runs.save(done)
    const open = await runs.listUnfinished()
    expect(open.map((run) => run.id)).toEqual([first.id, last.id])
  })
})
