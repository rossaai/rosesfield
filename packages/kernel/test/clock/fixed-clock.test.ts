import { describe, expect, it } from "vitest"
import { FixedClock } from "#clock/fixed-clock"

const start = new Date("2026-10-17T09:00:00.000Z")

describe("FixedClock", () => {
  it("returns the time it was given, on every read", () => {
    const clock = new FixedClock({ now: start })
    expect(clock.now().toISOString()).toBe("2026-10-17T09:00:00.000Z")
    expect(clock.now().toISOString()).toBe("2026-10-17T09:00:00.000Z")
  })

  it("moves forward only by what advance() adds", () => {
    const clock = new FixedClock({ now: start })
    clock.advance(90_000)
    expect(clock.now().toISOString()).toBe("2026-10-17T09:01:30.000Z")
  })

  it("keeps its time when a caller changes a Date it returned", () => {
    const given = new Date(start)
    const clock = new FixedClock({ now: given })
    clock.now().setUTCFullYear(2000)
    given.setUTCFullYear(2001)
    expect(clock.now().toISOString()).toBe("2026-10-17T09:00:00.000Z")
  })
})
