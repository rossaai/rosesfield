import {
  type AppDefinition,
  appDefinition,
  inputRulesOf,
  isRuledInput,
} from "@rosesfield/contract"
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
import { app } from "#background-removal/app"
import { readApps } from "#list-apps"

const photoId = assetIdFormat.parse("6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d")
const secondId = assetIdFormat.parse("7b8c9d0e-1f2a-4b3c-9d4e-5f6a7b8c9d0e")
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
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
    return { assetId, kind: "image", mime: "image/png", bytes: photo }
  }

  override async referencesOf(_id: CharacterId): Promise<readonly AssetId[]> {
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
  const apps = new ListedApps(readApps([{ folder: "background-removal", app }]))
  const engines = [new DemoGenerationEngine({ clock })]
  return {
    clock,
    assets,
    jobs,
    runs,
    start: new StartRunHandler({ apps, runs, engines, jobs, clock }),
    advance: new AdvanceRunHandler({ apps, runs, engines, assets, clock }),
  }
}

async function runToEnd(body: unknown) {
  const world = harness()
  const { run } = await world.start.execute({
    appId: "background-removal",
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

async function refusal(body: unknown) {
  const world = harness()
  await expect(
    world.start.execute({
      appId: "background-removal",
      body,
      idempotencyKey: null,
      seed: null,
    })
  ).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
  return world
}

describe("a Remove background run on the demo engine", () => {
  it("makes one PNG on Transparent and keeps the inputs with no seed", async () => {
    const { world, queued, finished } = await runToEnd({
      inputs: { image: [photoId] },
      aspectRatio: "4:3",
    })
    expect(queued).toMatchObject({
      appId: "background-removal",
      status: "queued",
      origin: "demo",
      count: 1,
    })
    expect(world.jobs.enqueued).toEqual([queued.id])
    expect(finished?.status).toBe("done")
    expect(finished?.inputs).toEqual({
      image: [photoId],
      background: "transparent",
      model: "birefnet",
    })
    expect(finished?.seed).toBeNull()
    expect(finished?.aspectRatio).toBe("4:3")
    expect(finished?.outputs).toHaveLength(1)
    expect(world.assets.reads).toEqual([photoId])
    expect(world.assets.kept).toHaveLength(1)
    const [output] = world.assets.kept
    expect(output).toMatchObject({
      kind: "image",
      mime: "image/png",
      width: 1024,
      height: 768,
    })
    expect([...(output?.bytes.slice(0, 8) ?? [])]).toEqual(pngSignature)
  })

  it("ends a Black run on Lucida with one output", async () => {
    const { finished } = await runToEnd({
      inputs: { image: [photoId], background: "black", model: "lucida" },
    })
    expect(finished?.status).toBe("done")
    expect(finished?.inputs).toMatchObject({
      background: "black",
      model: "lucida",
    })
    expect(finished?.outputs).toHaveLength(1)
  })

  it("refuses a run with no image and starts nothing", async () => {
    const world = await refusal({ inputs: { background: "white" } })
    expect(world.jobs.enqueued).toEqual([])
    expect(await world.runs.list()).toEqual([])
  })

  it("refuses a background the app does not list", async () => {
    const world = await refusal({
      inputs: { image: [photoId], background: "gray" },
    })
    expect(world.jobs.enqueued).toEqual([])
  })

  it("refuses a second image in one run", async () => {
    const world = await refusal({ inputs: { image: [photoId, secondId] } })
    expect(world.jobs.enqueued).toEqual([])
  })
})

describe("the Remove background inputs", () => {
  const definition = appDefinition.parse(app)

  it.each(["transparent", "white", "black"])(
    "apply as one set with no mode and no dependent bound on %s",
    (background) => {
      expect(definition.inputs.filter(isRuledInput)).toEqual([])
      const rules = inputRulesOf(definition, {
        image: [photoId],
        background,
      })
      expect(rules.map((rule) => rule.input.name)).toEqual([
        "image",
        "background",
        "model",
      ])
      const model = rules.find((rule) => rule.input.name === "model")
      expect(model?.allowed).toEqual(["birefnet", "lucida"])
    }
  )
})
