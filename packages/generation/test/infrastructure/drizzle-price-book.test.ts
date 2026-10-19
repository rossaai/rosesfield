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
})
