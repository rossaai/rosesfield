import { type AppDefinition, appDefinition } from "@rosesfield/contract"
import {
  AdvanceRunHandler,
  AppCatalog,
  DemoGenerationEngine,
  type EngineFile,
  JobRunner,
  Run,
  RunAssets,
  type RunOutput,
  RunRepository,
  StartRunHandler,
} from "@rosesfield/generation"
import {
  type AssetId,
  assetIdFormat,
  FixedClock,
  type RunId,
  runIdFormat,
} from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#relight/app"

const photoId = assetIdFormat.parse("3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f")
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

class MapRunRepository extends RunRepository {
  private readonly stored = new Map<RunId, Run>()

  override async add(run: Run): Promise<Run> {
    const next = run.withVersion(1)
    this.stored.set(run.id, next)
    return next
  }

  override async save(run: Run): Promise<Run> {
    const next = run.withVersion(run.version + 1)
    this.stored.set(run.id, next)
    return next
  }

  override async get(id: RunId): Promise<Run | null> {
    const run = this.stored.get(id)
    return run === undefined ? null : Run.restore(run.toState())
  }

  override async findByIdempotencyKey(key: string): Promise<Run | null> {
    const run = [...this.stored.values()].find(
      (candidate) => candidate.idempotencyKey === key
    )
    return run === undefined ? null : Run.restore(run.toState())
  }

  override async list(): Promise<Run[]> {
    return [...this.stored.values()]
  }

  override async listUnfinished(): Promise<Run[]> {
    return [...this.stored.values()].filter((run) => !run.isFinished())
  }
}

class ListedApps extends AppCatalog {
  private readonly apps: readonly AppDefinition[]

  constructor(apps: readonly AppDefinition[]) {
    super()
    this.apps = apps
  }

  override find(appId: string): AppDefinition | null {
    return this.apps.find((one) => one.id === appId) ?? null
  }
}

class NoJobs extends JobRunner {
  readonly enqueued: RunId[] = []

  override async enqueue(runId: RunId): Promise<void> {
    this.enqueued.push(runId)
  }
}

class KeptAssets extends RunAssets {
  readonly reads: string[] = []
  readonly kept: RunOutput[] = []

  override async read(assetId: AssetId): Promise<EngineFile> {
    this.reads.push(assetId)
    return {
      assetId,
      kind: "image",
      mime: "image/png",
      bytes: Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13),
    }
  }

  override async referencesOf(): Promise<readonly AssetId[]> {
    return []
  }

  override async keep(output: RunOutput): Promise<AssetId> {
    this.kept.push(output)
    return assetIdFormat.parse(crypto.randomUUID())
  }
}

function harness() {
  const clock = new FixedClock({ now: new Date("2026-10-17T09:00:00.000Z") })
  const runs = new MapRunRepository()
  const jobs = new NoJobs()
  const assets = new KeptAssets()
  const apps = new ListedApps([appDefinition.parse(app)])
  const engines = [new DemoGenerationEngine({ clock })]
  return {
    clock,
    assets,
    jobs,
    start: new StartRunHandler({ apps, runs, engines, jobs, clock }),
    advance: new AdvanceRunHandler({ apps, runs, engines, assets, clock }),
    runs,
  }
}

async function runToEnd(body: unknown) {
  const world = harness()
  const { run } = await world.start.execute({
    appId: "relight",
    body,
    idempotencyKey: crypto.randomUUID(),
    seed: null,
  })
  const runId = runIdFormat.parse(run.id)
  for (let step = 0; step < 20; step += 1) {
    const { nextWakeMs } = await world.advance.execute({ runId })
    if (nextWakeMs === null) {
      break
    }
    world.clock.advance(nextWakeMs)
  }
  const finished = await world.runs.get(runId)
  return { world, queued: run, finished: finished?.toRecord() ?? null }
}

describe("a Relight run on the demo engine", () => {
  it("makes one PNG from a photo lit from the left and warm, and keeps the inputs and the seed", async () => {
    const { world, queued, finished } = await runToEnd({
      inputs: { image: [photoId], direction: "left", color: "warm" },
      aspectRatio: "3:2",
    })
    expect(queued).toMatchObject({ appId: "relight", origin: "demo" })
    expect(world.jobs.enqueued).toEqual([queued.id])
    expect(world.assets.reads).toEqual([photoId])
    expect(finished?.status).toBe("done")
    expect(finished?.inputs).toMatchObject({
      image: [photoId],
      direction: "left",
      softness: "auto",
      color: "warm",
      brightness: 0,
      quality: "draft",
      model: "qwen-image-edit-2509-relight",
    })
    expect(finished?.seed).toEqual(expect.any(Number))
    expect(finished?.count).toBe(1)
    expect(finished?.outputs).toHaveLength(1)
    expect(world.assets.kept).toHaveLength(1)
    const output = world.assets.kept[0]
    expect(output).toMatchObject({ kind: "image", mime: "image/png" })
    expect([...(output?.bytes.slice(0, 8) ?? [])]).toEqual(pngSignature)
  })

  it("makes 4 outputs at a count of 4 with a fixed seed on 2511 at final", async () => {
    const { finished } = await runToEnd({
      inputs: {
        image: [photoId],
        brightness: 2,
        prompt: "Light from a candle on the table",
        quality: "final",
        model: "qwen-image-edit-2511",
        seed: 7,
      },
      count: 4,
    })
    expect(finished?.status).toBe("done")
    expect(finished?.seed).toBe(7)
    expect(finished?.count).toBe(4)
    expect(finished?.outputs).toHaveLength(4)
  })

  it("refuses a run with no photo and starts nothing", async () => {
    const world = harness()
    await expect(
      world.start.execute({
        appId: "relight",
        body: { inputs: { direction: "left" } },
        idempotencyKey: null,
        seed: null,
      })
    ).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
    expect(world.jobs.enqueued).toEqual([])
  })

  it("refuses a count of 5 and a brightness of 3", async () => {
    const world = harness()
    await expect(
      world.start.execute({
        appId: "relight",
        body: { inputs: { image: [photoId] }, count: 5 },
        idempotencyKey: null,
        seed: null,
      })
    ).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
    await expect(
      world.start.execute({
        appId: "relight",
        body: { inputs: { image: [photoId], brightness: 3 } },
        idempotencyKey: null,
        seed: null,
      })
    ).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
    expect(world.jobs.enqueued).toEqual([])
  })
})
