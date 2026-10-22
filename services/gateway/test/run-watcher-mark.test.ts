import { buildPath, routes, runResponse } from "@rosesfield/contract"
import { DemoGenerationEngine, type WatchMarkPort } from "@rosesfield/generation"
import type { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { RunWatcher } from "#worker/run-watcher"
import type { WorkerBindings } from "#worker/worker-ports"
import { type Harness, harnessFor, jsonInit } from "./harness"
import { localPorts } from "./local-ports"

class FakeStorage {
  readonly values = new Map<string, unknown>()
  alarm: number | null = null

  async get(key: string): Promise<unknown> {
    return this.values.get(key)
  }

  async put(key: string, value: unknown): Promise<void> {
    this.values.set(key, value)
  }

  async delete(key: string): Promise<boolean> {
    return this.values.delete(key)
  }

  async deleteAll(): Promise<void> {
    this.values.clear()
  }

  async getAlarm(): Promise<number | null> {
    return this.alarm
  }

  async setAlarm(at: number): Promise<void> {
    this.alarm = at
  }
}

type Watcher = {
  watcher: RunWatcher
  storage: FakeStorage
  marks: WatchMarkPort
}

function watcherFor(): Watcher {
  const storage = new FakeStorage()
  const state = { storage } as unknown as DurableObjectState
  const watcher = new RunWatcher(state, {} as unknown as WorkerBindings)
  const stub = {
    fetch: (url: string, init: RequestInit) =>
      watcher.fetch(new Request(url, init)),
  }
  const watchers = {
    getByName: () => stub,
  } as unknown as DurableObjectNamespace
  return { watcher, storage, marks: RunWatcher.marksOf(watchers) }
}

const held = (_ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true })
  })

function heldDemo(clock: FixedClock): DemoGenerationEngine {
  return new DemoGenerationEngine({
    clock,
    timer: { after: () => () => undefined },
  })
}

async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

async function until(check: () => boolean): Promise<void> {
  for (let tick = 0; tick < 50 && !check(); tick += 1) {
    await settled()
  }
}

let gateway: Harness | null = null

afterEach(() => {
  gateway?.close()
  gateway = null
})

describe("the run watcher while a stream holds the run", () => {
  it("skips the alarm's read while the stream's mark holds, and wakes once the stream ends", async () => {
    const { watcher, storage, marks } = watcherFor()
    gateway = harnessFor({
      portsFor: (clock, folder) => ({
        ...localPorts(clock, folder),
        engines: [heldDemo(clock)],
        watchMarks: marks,
      }),
    })
    const started = await gateway.call(
      buildPath(routes.startRun.path, { appId: "sample-image" }),
      jsonInit({ inputs: { prompt: "a red door in fog" } })
    )
    const runId = runResponse.parse(await started.json()).run.id
    await watcher.fetch(
      new Request(RunWatcher.watchUrl, { method: "POST", body: runId })
    )
    const stop = new AbortController()
    const frames = gateway.handlers.advanceRun.watch({
      runId,
      signal: stop.signal,
      pause: held,
    })
    await frames.next()
    const following = frames.next()
    await until(() => storage.values.has(RunWatcher.watchedKey))

    const watchedUntil = storage.values.get(RunWatcher.watchedKey)
    expect(watchedUntil).toBeGreaterThan(Date.now())
    await watcher.alarm()
    expect(storage.alarm).toBe(watchedUntil)
    expect(storage.values.get(RunWatcher.runKey)).toBe(runId)

    stop.abort()
    await following
    await frames.return()
    expect(storage.values.has(RunWatcher.watchedKey)).toBe(false)
    expect(storage.alarm).toBeLessThanOrEqual(Date.now())
  })
})
