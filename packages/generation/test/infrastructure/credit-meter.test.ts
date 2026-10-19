import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { CreditMeter } from "#infrastructure/credit-meter"
import { RouterHttp } from "#infrastructure/router/router-http"
import { start } from "../sample"
import { balance } from "./fixtures/comfy-router"
import { type Recording, ReplayFetch } from "./replay-fetch"

function readerOf(recordings: Recording[], apiKey = "key") {
  const replay = new ReplayFetch(recordings)
  const http = new RouterHttp({
    apiKey,
    fetch: replay.fetch,
    timeoutMs: 1000,
    downloadTimeoutMs: 1000,
  })
  return { http, replay }
}

function meterAt() {
  const waits: number[] = []
  const meter = new CreditMeter({
    clock: new FixedClock({ now: start }),
    wait: async (ms) => {
      waits.push(ms)
    },
  })
  return { meter, waits }
}

describe("CreditMeter", () => {
  it("measures a run alone on its account by the balance before and after", async () => {
    const { meter } = meterAt()
    const { http, replay } = readerOf([
      balance(1990.054531034),
      balance(1989.491133914),
    ])
    const ticket = await meter.start(http)
    meter.bind(ticket, "run-1")
    expect(await meter.finishRef(http, "run-1")).toBe(1.188768)
    expect(await meter.finishRef(http, "run-1")).toBe(1.188768)
    expect(replay.unused()).toEqual([])
  })

  it("measures nothing when two runs of one account overlap", async () => {
    const { meter } = meterAt()
    const { http, replay } = readerOf([balance(1000), balance(990)])
    const first = await meter.start(http)
    const second = await meter.start(http)
    meter.bind(first, "run-1")
    meter.bind(second, "run-2")
    expect(await meter.finishRef(http, "run-1")).toBeNull()
    expect(await meter.finishRef(http, "run-2")).toBeNull()
    expect(replay.unused().length).toBe(1)
  })

  it("keeps runs of two accounts apart", async () => {
    const { meter } = meterAt()
    const one = readerOf([balance(1000), balance(999)], "first-key")
    const two = readerOf([balance(500), balance(498)], "second-key")
    const first = await meter.start(one.http)
    const second = await meter.start(two.http)
    expect(await meter.finish(one.http, first)).toBe(2.11)
    expect(await meter.finish(two.http, second)).toBe(4.22)
  })

  it("waits for the charge to post, then reads it", async () => {
    const { meter, waits } = meterAt()
    const { http } = readerOf([balance(1000), balance(1000), balance(999)])
    const ticket = await meter.start(http)
    expect(await meter.finish(http, ticket)).toBe(2.11)
    expect(waits).toEqual([2000])
  })

  it("measures nothing for a run that charged nothing it could see", async () => {
    const { meter, waits } = meterAt()
    const { http } = readerOf(Array.from({ length: 6 }, () => balance(1000)))
    const ticket = await meter.start(http)
    expect(await meter.finish(http, ticket)).toBeNull()
    expect(waits).toHaveLength(4)
  })

  it("measures nothing without a key", async () => {
    const { meter } = meterAt()
    const { http, replay } = readerOf([])
    const keyless = new RouterHttp({
      apiKey: null,
      fetch: replay.fetch,
      timeoutMs: 1000,
      downloadTimeoutMs: 1000,
    })
    expect(await meter.start(keyless)).toBeNull()
    expect(http.hasKey).toBe(true)
  })
})
