import type { AppDefinition } from "@rosesfield/contract"
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
  type CharacterId,
  FixedClock,
  type RunId,
  runIdFormat,
} from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#characters/app"
import { readApps } from "#list-apps"

const photoId = assetIdFormat.parse("0b6f4f1e-3c2a-4d5e-8f70-1a2b3c4d5e6f")
const characterId = "5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"

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
      bytes: new Uint8Array(8),
    }
  }

  override async referencesOf(id: CharacterId): Promise<readonly AssetId[]> {
    return id === characterId ? [photoId] : []
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
  const apps = new ListedApps(readApps([{ folder: "characters", app }]))
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
    appId: "characters",
    body,
    idempotencyKey: crypto.randomUUID(),
    seed: 7,
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

describe("a Characters run on the demo engine", () => {
  it("starts a traits run and ends with the chosen count of portraits", async () => {
    const { world, queued, finished } = await runToEnd({
      inputs: { gender: "woman", hairLength: "bald", count: "3" },
      aspectRatio: "3:4",
    })
    expect(queued.status).toBe("queued")
    expect(queued.origin).toBe("demo")
    expect(world.jobs.enqueued).toEqual([queued.id])
    expect(finished?.status).toBe("done")
    expect(finished?.outputs).toHaveLength(3)
    expect(finished?.inputs).toMatchObject({
      mode: "traits",
      count: "3",
      model: "flux-2-klein-4b",
    })
    expect(finished?.count).toBe(3)
    expect(
      world.assets.kept.map((output) => [output.width, output.height])
    ).toEqual([
      [768, 1024],
      [768, 1024],
      [768, 1024],
    ])
  })

  it("starts an angles run with a character and reads its first photo", async () => {
    const { world, finished } = await runToEnd({
      inputs: {
        mode: "angles",
        character: [characterId],
        angleSet: "quarters",
      },
    })
    expect(finished?.status).toBe("done")
    expect(finished?.count).toBe(4)
    expect(finished?.outputs).toHaveLength(4)
    expect(finished?.inputs).toMatchObject({ mode: "angles", count: "4" })
    expect(finished?.inputs).not.toHaveProperty("model")
    expect(world.assets.reads).toEqual([photoId])
  })

  it("refuses a model the traits mode does not list, and starts no run", async () => {
    const world = harness()
    await expect(
      world.start.execute({
        appId: "characters",
        body: { inputs: { model: "qwen-image-edit-2511" } },
        idempotencyKey: null,
        seed: null,
      })
    ).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
    expect(world.jobs.enqueued).toEqual([])
  })

  it("refuses an age under the list's first value", async () => {
    const world = harness()
    await expect(
      world.start.execute({
        appId: "characters",
        body: { inputs: { age: "teen" } },
        idempotencyKey: null,
        seed: null,
      })
    ).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
  })

  const character = [characterId]
  const refused = [
    {
      why: "angles makes 4 views, so it takes no other count",
      body: { inputs: { mode: "angles", character, count: "2" } },
      fixed: { inputs: { mode: "angles", character, count: "4" } },
    },
    {
      why: "the run count follows the count input",
      body: { inputs: { count: "3" }, count: 2 },
      fixed: { inputs: { count: "3" }, count: 3 },
    },
    {
      why: "angles needs a character",
      body: { inputs: { mode: "angles" } },
      fixed: { inputs: { mode: "angles", character } },
    },
    {
      why: "a trait applies only in traits",
      body: { inputs: { mode: "angles", character, gender: "man" } },
      fixed: { inputs: { mode: "traits", gender: "man" } },
    },
    {
      why: "an angle set applies only in angles",
      body: { inputs: { angleSet: "heights" } },
      fixed: { inputs: { mode: "angles", character, angleSet: "heights" } },
    },
    {
      why: "the count stops at 4",
      body: { inputs: { count: "5" } },
      fixed: { inputs: { count: "4" } },
    },
  ]

  it.each(refused)(
    "refuses a run when $why, and starts the fixed one",
    async ({ body, fixed }) => {
      const world = harness()
      await expect(
        world.start.execute({
          appId: "characters",
          body,
          idempotencyKey: null,
          seed: null,
        })
      ).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
      expect(world.jobs.enqueued).toEqual([])
      const { run } = await world.start.execute({
        appId: "characters",
        body: fixed,
        idempotencyKey: null,
        seed: null,
      })
      expect(world.jobs.enqueued).toEqual([run.id])
    }
  )
})
