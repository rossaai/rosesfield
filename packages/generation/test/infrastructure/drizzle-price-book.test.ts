import { drizzle } from "drizzle-orm/bun-sqlite"
import { describe, expect, it } from "vitest"
import { migrateRunTable } from "#infrastructure/bun-sqlite-run-migration"
import { DrizzlePriceBook } from "#infrastructure/drizzle-price-book"
import { start } from "../sample"

function book(): DrizzlePriceBook {
  const db = drizzle(":memory:")
  migrateRunTable(db)
  return new DrizzlePriceBook({ db })
}

const run = { model: "maker/picture-2", settings: '[["count",1]]' }

describe("DrizzlePriceBook", () => {
  it("finds the last cost kept for a model at its settings", async () => {
    const prices = book()
    expect(await prices.find(run)).toBeNull()
    await prices.keep({
      ...run,
      cost: { amount: 0.0056, currency: "USD" },
      measuredAt: start,
    })
    await prices.keep({
      ...run,
      cost: { amount: 0.0057, currency: "USD" },
      measuredAt: start,
    })
    expect(await prices.find(run)).toEqual({ amount: 0.0057, currency: "USD" })
    expect(await prices.find({ ...run, settings: '[["count",2]]' })).toBeNull()
  })

  it("lists every measured cost of one model, one per settings, and none of another model", async () => {
    const prices = book()
    await prices.keep({
      ...run,
      cost: { amount: 0.0057, currency: "USD" },
      measuredAt: start,
    })
    await prices.keep({
      ...run,
      settings: '[["count",2]]',
      cost: { amount: 0.0114, currency: "USD" },
      measuredAt: start,
    })
    await prices.keep({
      model: "maker/other-1",
      settings: '[["count",1]]',
      cost: { amount: 1, currency: "USD" },
      measuredAt: start,
    })
    expect(await prices.runsOf(run.model)).toEqual(
      expect.arrayContaining([
        {
          settings: '[["count",1]]',
          cost: { amount: 0.0057, currency: "USD" },
        },
        {
          settings: '[["count",2]]',
          cost: { amount: 0.0114, currency: "USD" },
        },
      ])
    )
    expect(await prices.runsOf(run.model)).toHaveLength(2)
    expect(await prices.runsOf("maker/none")).toEqual([])
  })
})
