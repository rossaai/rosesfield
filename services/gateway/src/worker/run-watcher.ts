import { AdvanceRunHandler } from "@rosesfield/generation"
import { type RunId, runIdFormat } from "@rosesfield/kernel"
import { buildAdvance, buildLibrary } from "#build-handlers"
import {
  ownerPorts,
  type WorkerBindings,
  workerParts,
} from "#worker/worker-ports"

export class RunWatcher implements DurableObject {
  static readonly runKey = "runId"
  static readonly watchedKey = "watchedUntil"
  static readonly errorDelayMs = 30_000
  static readonly watchUrl = "https://run-watcher/watch"
  static readonly markUrl = "https://run-watcher/mark"

  private readonly state: DurableObjectState
  private readonly env: WorkerBindings

  constructor(state: DurableObjectState, env: WorkerBindings) {
    this.state = state
    this.env = env
  }

  static async mark(
    watchers: DurableObjectNamespace,
    runId: RunId
  ): Promise<void> {
    await watchers
      .getByName(runId)
      .fetch(RunWatcher.markUrl, { method: "POST", body: runId })
  }

  async fetch(request: Request): Promise<Response> {
    const runId = runIdFormat.parse(await request.text())
    if (request.url === RunWatcher.markUrl) {
      await this.state.storage.put(
        RunWatcher.watchedKey,
        Date.now() + AdvanceRunHandler.watchMarkMs
      )
      return new Response(null, { status: 204 })
    }
    await this.state.storage.put(RunWatcher.runKey, runId)
    if ((await this.state.storage.getAlarm()) === null) {
      await this.state.storage.setAlarm(Date.now())
    }
    return new Response(null, { status: 204 })
  }

  async alarm(): Promise<void> {
    const stored: unknown = await this.state.storage.get(RunWatcher.runKey)
    if (!runIdFormat.is(stored)) {
      return
    }
    const ports = ownerPorts(workerParts(this.env))
    const now = ports.clock.now().getTime()
    const watched: unknown = await this.state.storage.get(
      RunWatcher.watchedKey
    )
    if (typeof watched === "number" && watched > now) {
      await this.state.storage.setAlarm(watched)
      return
    }
    const advance = buildAdvance(ports, buildLibrary(ports))
    const next = await nextWake(advance, stored)
    if (next === null) {
      await this.state.storage.deleteAll()
      return
    }
    await this.state.storage.setAlarm(ports.clock.now().getTime() + next)
  }
}

async function nextWake(
  advance: AdvanceRunHandler,
  runId: RunId
): Promise<number | null> {
  try {
    return (await advance.execute({ runId })).nextWakeMs
  } catch (error) {
    console.error(error)
    return RunWatcher.errorDelayMs
  }
}
