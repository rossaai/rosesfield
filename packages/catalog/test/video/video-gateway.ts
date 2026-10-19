import type { AppDefinition } from "@rosesfield/contract"
import {
  AdvanceRunHandler,
  AppCatalog,
  type EngineFile,
  type GenerationEngine,
  JobRunner,
  Run,
  RunAssets,
  type RunOutput,
  type RunPage,
  RunRepository,
  StartRunHandler,
} from "@rosesfield/generation"
import {
  type AssetId,
  assetIdFormat,
  FixedClock,
  type RunId,
} from "@rosesfield/kernel"
import { readApps } from "#list-apps"
import { app } from "#video/app"

export const start = new Date("2026-10-17T09:00:00.000Z")

export function videoApp(): AppDefinition {
  const [parsed] = readApps([{ folder: "video", app }])
  if (parsed === undefined) {
    throw new Error("The Video app did not parse")
  }
  return parsed
}

class ListedApps extends AppCatalog {
  private readonly video = videoApp()

  override find(appId: string): AppDefinition | null {
    return appId === this.video.id ? this.video : null
  }
}

class MemoryRuns extends RunRepository {
  readonly stored = new Map<RunId, Run>()

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
      (one) => one.idempotencyKey === key
    )
    return run === undefined ? null : Run.restore(run.toState())
  }

  override async list(_page: RunPage): Promise<Run[]> {
    return [...this.stored.values()]
  }

  override async listUnfinished(): Promise<Run[]> {
    return [...this.stored.values()].filter((run) => !run.isFinished())
  }
}

class QueuedJobs extends JobRunner {
  readonly queued: RunId[] = []

  override async enqueue(runId: RunId): Promise<void> {
    this.queued.push(runId)
  }
}

class KeptAssets extends RunAssets {
  readonly kept: RunOutput[] = []

  override async read(assetId: AssetId): Promise<EngineFile> {
    return {
      assetId,
      kind: "image",
      mime: "image/png",
      bytes: Uint8Array.of(137, 80, 78, 71),
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

export function videoGateway(
  engineFor: (clock: FixedClock) => GenerationEngine
) {
  const clock = new FixedClock({ now: start })
  const apps = new ListedApps()
  const runs = new MemoryRuns()
  const jobs = new QueuedJobs()
  const assets = new KeptAssets()
  const engines = [engineFor(clock)]
  const startRun = new StartRunHandler({ apps, runs, engines, jobs, clock })
  const advance = new AdvanceRunHandler({ apps, runs, engines, assets, clock })
  const step = (runId: RunId) => advance.execute({ runId })
  const drive = async (runId: RunId): Promise<void> => {
    for (let count = 0; count < 20; count += 1) {
      const { nextWakeMs } = await step(runId)
      if (nextWakeMs === null) {
        return
      }
      clock.advance(nextWakeMs)
    }
    throw new Error(`Run ${runId} did not end in 20 steps`)
  }
  const startVideo = (
    inputs: Record<string, unknown>,
    count = 1,
    idempotencyKey: string = crypto.randomUUID()
  ) =>
    startRun.execute({
      appId: "video",
      body: { inputs, count },
      idempotencyKey,
      seed: null,
    })
  return { clock, runs, jobs, assets, startVideo, step, drive }
}
