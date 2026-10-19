import { describe, expect, it } from "vitest"
import { run, runStatus } from "#run.contract"
import { sampleRun } from "./sample"

describe("run", () => {
  it("parses a done run with its outputs, seed, cost and engine", () => {
    const parsed = run.parse(sampleRun())
    expect(parsed.status).toBe("done")
    expect(parsed.outputs).toHaveLength(1)
    expect(parsed.seed).toBe(42)
    expect(parsed.cost).toEqual({ amount: 0.02, currency: "USD" })
    expect(parsed.engine.models).toEqual(["sample-model"])
  })

  it("parses a demo run whose cost and seed are unknown", () => {
    const parsed = run.parse({
      ...sampleRun(),
      origin: "demo",
      cost: null,
      seed: null,
    })
    expect(parsed.origin).toBe("demo")
    expect(parsed.cost).toBeNull()
  })

  it("parses a failed run with its error code", () => {
    const parsed = run.parse({
      ...sampleRun(),
      status: "failed",
      outputs: [],
      failure: { code: "ENGINE_UNAVAILABLE", status: 502 },
    })
    expect(parsed.failure?.code).toBe("ENGINE_UNAVAILABLE")
  })

  it.each(["queued", "running", "done", "failed", "cancelled"])(
    "accepts the state %s",
    (status) => {
      expect(runStatus.safeParse(status).success).toBe(true)
    }
  )

  it.each(["paused", "succeeded", "canceled"])(
    "refuses the state %s",
    (status) => {
      expect(run.safeParse({ ...sampleRun(), status }).success).toBe(false)
    }
  )

  it("refuses a cost in a currency other than USD", () => {
    const cost = { amount: 0.02, currency: "EUR" }
    expect(run.safeParse({ ...sampleRun(), cost }).success).toBe(false)
  })

  it("refuses a time that is not an ISO 8601 UTC time", () => {
    const createdAt = "17/10/2026 09:00"
    expect(run.safeParse({ ...sampleRun(), createdAt }).success).toBe(false)
  })
})
