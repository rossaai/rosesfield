import type { Run as RunRecord } from "@rosesfield/contract"
import type { RunId } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { RunFrame } from "#application/watch-run/watch-run.handler"
import { RunNotFoundError } from "#domain/error/run-not-found.error"
import type {
  EngineOutput,
  EngineStatus,
  Pause,
} from "#domain/generation-engine.port"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { pngBytes } from "../sample"
import { type Harness, harnessFor, startImage } from "./harness"

const image: EngineOutput = {
  kind: "image",
  mime: "image/png",
  bytes: pngBytes(),
  width: 2,
  height: 2,
  durationSeconds: null,
}

const missingRun = "9b1f6c2e-3a4d-4e5f-8a6b-7c8d9e0f1a2b"

type Pauses = { pause: Pause; asked: number[] }

function pausesFor(harness: Harness): Pauses {
  const asked: number[] = []
  const pause: Pause = (ms, signal) => {
    asked.push(ms)
    const renewals = asked.filter((one) => one === 30_000).length
    if (ms === 30_000 && renewals > 1) {
      return new Promise((resolve) =>
        signal.addEventListener("abort", () => resolve(), { once: true })
      )
    }
    harness.clock.advance(ms)
    return Promise.resolve()
  }
  return { pause, asked }
}

function countSaves(harness: Harness): { count: () => number } {
  const save = harness.runs.save.bind(harness.runs)
  let saves = 0
  harness.runs.save = async (run) => {
    saves += 1
    return save(run)
  }
  return { count: () => saves }
}

async function framesOf(
  harness: Harness,
  runId: RunId,
  pauses: Pauses,
  onFrame: (frame: RunFrame) => Promise<void> = async () => undefined
): Promise<RunRecord[]> {
  const frames: RunRecord[] = []
  for await (const frame of harness.advance.watch({
    runId,
    signal: new AbortController().signal,
    pause: pauses.pause,
  })) {
    frames.push(frame.run)
    await onFrame(frame)
  }
  return frames
}

function progressOf(index: number): EngineStatus {
  return { state: "running", progress: index / 400, retryAfterSeconds: null }
}

describe("WatchRunHandler", () => {
  it("relays each progress event and keeps the result on the terminal status without a second read", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [image],
      watches: [
        [
          { state: "queued", progress: null, retryAfterSeconds: null },
          { state: "running", progress: 0.25, retryAfterSeconds: null },
          { state: "running", progress: 0.5, retryAfterSeconds: null },
          { state: "succeeded" },
        ],
      ],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)

    const frames = await framesOf(harness, runId, pausesFor(harness))

    expect(frames.map((run) => [run.status, run.progress])).toEqual([
      ["queued", null],
      ["queued", null],
      ["running", 0.25],
      ["running", 0.5],
      ["done", 1],
    ])
    expect(frames.at(-1)?.outputs).toHaveLength(1)
    expect(engine.watched).toEqual(["fake-1"])
    expect(engine.reads).toEqual([])
  })

  it("writes a run that reports progress twice a second for 180 s only when its state changes", async () => {
    const progress = Array.from({ length: 360 }, (_, index) =>
      progressOf(index + 1)
    )
    const engine = new FakeGenerationEngine({
      outputs: [image],
      watches: [
        [
          { state: "queued", progress: null, retryAfterSeconds: null },
          ...progress,
          { state: "succeeded" },
        ],
      ],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const saves = countSaves(harness)

    const frames = await framesOf(harness, runId, pausesFor(harness))

    expect(frames).toHaveLength(363)
    expect(frames.at(-1)?.status).toBe("done")
    expect(saves.count()).toBeLessThanOrEqual(4)
  })

  it("saves the last progress value when the stream closes before the run ends", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [image],
      steps: [{ state: "succeeded" }],
      watches: [
        [
          { state: "running", progress: 0.1, retryAfterSeconds: null },
          { state: "running", progress: 0.6, retryAfterSeconds: null },
        ],
      ],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const stop = new AbortController()
    const seen: number[] = []
    for await (const frame of harness.advance.watch({
      runId,
      signal: stop.signal,
      pause: pausesFor(harness).pause,
    })) {
      seen.push(frame.run.progress ?? -1)
      if (frame.run.progress === 0.6) {
        stop.abort()
      }
    }
    const stored = (await harness.get.execute({ runId })).run
    expect(stored.progress).toBe(0.6)
    expect(seen).toContain(0.6)
  })

  it("reads the run once, waits 2 s and opens the engine's stream again when it ends without a terminal status", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [image],
      steps: [{ state: "running", progress: 0.3, retryAfterSeconds: null }],
      watches: [
        [{ state: "running", progress: 0.2, retryAfterSeconds: null }],
        [{ state: "succeeded" }],
      ],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const pauses = pausesFor(harness)

    const frames = await framesOf(harness, runId, pauses)

    expect(frames.at(-1)?.status).toBe("done")
    expect(engine.watched).toEqual(["fake-1", "fake-1"])
    expect(engine.reads).toEqual(["fake-1"])
    expect(pauses.asked).toContain(2000)
  })

  it("skips the watcher's read while the stream marks the run, and stops skipping once the stream ends", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [image],
      steps: [{ state: "running", progress: 0.4, retryAfterSeconds: null }],
      watches: [
        [
          { state: "running", progress: 0.1, retryAfterSeconds: null },
          { state: "running", progress: 0.2, retryAfterSeconds: null },
          { state: "succeeded" },
        ],
      ],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const skipped: (number | null)[] = []
    await framesOf(harness, runId, pausesFor(harness), async (frame) => {
      if (frame.run.progress === 0.1) {
        skipped.push((await harness.advance.execute({ runId })).nextWakeMs)
      }
    })

    expect(skipped).toEqual([60_000])
    expect(engine.reads).toEqual([])
    const after = await harness.advance.execute({ runId })
    expect(after).toEqual({ nextWakeMs: null })
  })

  it("renews the mark every 30 s, so the watcher still skips after the first 60 s", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [image],
      watches: [
        [
          { state: "running", progress: 0.1, retryAfterSeconds: null },
          { state: "running", progress: 0.2, retryAfterSeconds: null },
          { state: "succeeded" },
        ],
      ],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const held: (number | null)[] = []
    await framesOf(harness, runId, pausesFor(harness), async (frame) => {
      if (frame.run.progress === 0.2) {
        harness.clock.advance(45_000)
        held.push((await harness.advance.execute({ runId })).nextWakeMs)
      }
    })

    expect(held).toEqual([15_000])
    expect(engine.reads).toEqual([])
  })

  it("sends the run as it is and ends when no engine holds it", async () => {
    const harness = harnessFor({ engines: [new FakeGenerationEngine()] })
    const runId = await startImage(harness)
    const other = harnessFor({ engines: [] })
    const record = await harness.runs.get(runId)
    if (record === null) {
      throw new Error("the run was not stored")
    }
    await other.runs.add(record)

    const frames = await framesOf(other, runId, pausesFor(other))

    expect(frames.map((run) => run.status)).toEqual(["queued"])
  })

  it("refuses a run it does not hold", async () => {
    const harness = harnessFor()
    const frames = harness.advance.watch({
      runId: missingRun,
      signal: new AbortController().signal,
      pause: pausesFor(harness).pause,
    })
    await expect(frames.next()).rejects.toBeInstanceOf(RunNotFoundError)
  })
})
