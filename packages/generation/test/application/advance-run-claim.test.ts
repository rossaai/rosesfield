import { describe, expect, it } from "vitest"
import { submitClaimMs } from "#application/advance-run/run-timing"
import { RunFailedError } from "#domain/error/run-failed.error"
import type {
  EngineRequest,
  EngineSubmission,
} from "#domain/generation-engine.port"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { harnessFor, startImage } from "./harness"

class OneKeyAtATime extends FakeGenerationEngine {
  private readonly inFlight = new Set<string>()

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    if (this.inFlight.has(request.idempotencyKey)) {
      throw new RunFailedError({ cause: "the key is already in flight" })
    }
    this.inFlight.add(request.idempotencyKey)
    await Promise.resolve()
    const submission = await super.submit(request)
    this.inFlight.delete(request.idempotencyKey)
    return submission
  }
}

describe("AdvanceRunHandler, a queued run two watchers read", () => {
  it("is sent to the engine once, and neither watcher fails it", async () => {
    const engine = new OneKeyAtATime({ refByKey: true })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await Promise.all([
      harness.advance.execute({ runId }),
      harness.advance.execute({ runId }),
    ])
    expect(engine.submitted).toHaveLength(1)
    const run = await harness.runs.get(runId)
    expect(run?.status).toBe("queued")
    expect(run?.jobs[0]?.status).toBe("queued")
  })

  it("waits while another watcher holds the claim, then sends again with the same key", async () => {
    const engine = new FakeGenerationEngine({ refByKey: true })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const run = await harness.runs.get(runId)
    if (run === null) {
      throw new Error("the run was not stored")
    }
    run.submitting({ index: 0, now: harness.clock.now() })
    await harness.runs.save(run)
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 2000,
    })
    expect(engine.submitted).toEqual([])
    harness.clock.advance(submitClaimMs)
    await harness.advance.execute({ runId })
    expect(engine.submitted.map((one) => one.idempotencyKey)).toEqual([runId])
    expect((await harness.runs.get(runId))?.jobs[0]?.status).toBe("queued")
  })
})
