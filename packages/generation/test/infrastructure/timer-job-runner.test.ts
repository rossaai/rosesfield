import { FixedClock, type RunId, runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { AdvanceRunHandler } from "#application/advance-run/advance-run.handler"
import { type Timer, TimerJobRunner } from "#infrastructure/timer-job-runner"
import { harnessFor, startImage } from "../application/harness"
import { FakeAppCatalog } from "../fake/fake-app-catalog"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakeRunAssets } from "../fake/fake-run-assets"
import { FakeRunRepository } from "../fake/fake-run-repository"
import { imageApp, start } from "../sample"

class ManualTimer {
  readonly waits: number[] = []
  private due: (() => void)[] = []

  readonly timer: Timer = {
    after: (ms, callback) => {
      this.waits.push(ms)
      this.due.push(callback)
      return () => {
        this.due = this.due.filter((entry) => entry !== callback)
      }
    },
  }

  pending(): number {
    return this.due.length
  }

  async fire(): Promise<void> {
    const callbacks = this.due
    this.due = []
    for (const callback of callbacks) {
      callback()
    }
    await new Promise((resolve) => setImmediate(resolve))
  }
}

class CountingAdvance extends AdvanceRunHandler {
  readonly woken: RunId[] = []
  private readonly answers: (number | null | Error)[]

  constructor(answers: (number | null | Error)[]) {
    super({
      apps: new FakeAppCatalog([imageApp()]),
      runs: new FakeRunRepository(),
      engines: [],
      assets: new FakeRunAssets(),
      clock: new FixedClock({ now: start }),
    })
    this.answers = answers
  }

  override async execute(input: { runId: RunId }) {
    this.woken.push(input.runId)
    const answer = this.answers.shift() ?? null
    if (answer instanceof Error) {
      throw answer
    }
    return { nextWakeMs: answer }
  }
}

const runId = runIdFormat.parse("1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f")

function runnerWith(answers: (number | null | Error)[]) {
  const manual = new ManualTimer()
  const advance = new CountingAdvance(answers)
  const runner = new TimerJobRunner({
    advance,
    runs: new FakeRunRepository(),
    timer: manual.timer,
  })
  return { manual, advance, runner }
}

describe("TimerJobRunner", () => {
  it("wakes a run at once, then after each delay, until it ends", async () => {
    const { manual, advance, runner } = runnerWith([2000, 3000, null])
    const id = runId
    await runner.enqueue(id)
    for (let wake = 0; wake < 3; wake += 1) {
      await manual.fire()
    }
    expect(manual.waits).toEqual([0, 2000, 3000])
    expect(advance.woken).toHaveLength(3)
    expect(runner.isWatching(id)).toBe(false)
    expect(manual.pending()).toBe(0)
  })

  it("watches a run once however often it is enqueued", async () => {
    const { manual, runner } = runnerWith([null])
    const id = runId
    await runner.enqueue(id)
    await runner.enqueue(id)
    expect(manual.pending()).toBe(1)
  })

  it("tries again later when a wake throws", async () => {
    const { manual, runner } = runnerWith([new Error("database closed"), null])
    await runner.enqueue(runId)
    await manual.fire()
    expect(manual.waits).toEqual([0, TimerJobRunner.errorDelayMs])
  })

  it("stops every timer when stopped", async () => {
    const { manual, runner } = runnerWith([2000])
    await runner.enqueue(runId)
    runner.stop()
    expect(manual.pending()).toBe(0)
  })

  it("resumes every run that has not finished", async () => {
    const harness = harnessFor({ engines: [new FakeGenerationEngine()] })
    const open = await startImage(harness)
    const closed = await startImage(harness)
    await harness.cancel.execute({ runId: closed })
    const manual = new ManualTimer()
    const runner = new TimerJobRunner({
      advance: harness.advance,
      runs: harness.runs,
      timer: manual.timer,
    })
    expect(await runner.resume()).toBe(1)
    expect(runner.isWatching(open)).toBe(true)
    expect(runner.isWatching(closed)).toBe(false)
  })

  it("drives a run to done through the advance use case", async () => {
    const harness = harnessFor({
      engines: [
        new FakeGenerationEngine({
          outputs: [
            {
              kind: "image",
              mime: "image/png",
              bytes: Uint8Array.of(1),
              width: null,
              height: null,
              durationSeconds: null,
            },
          ],
        }),
      ],
    })
    const manual = new ManualTimer()
    const runner = new TimerJobRunner({
      advance: harness.advance,
      runs: harness.runs,
      timer: manual.timer,
    })
    const id = await startImage(harness)
    await runner.enqueue(id)
    await manual.fire()
    await manual.fire()
    expect((await harness.get.execute({ runId: id })).run.status).toBe("done")
    expect(runner.isWatching(id)).toBe(false)
  })
})
