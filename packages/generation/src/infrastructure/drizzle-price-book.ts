import type { Cost } from "@rosesfield/contract"
import { and, eq } from "drizzle-orm"
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"
import { type MeasuredPrice, PriceBook } from "#domain/price-book.port"
import type { PricedRun } from "#domain/priced-run"
import { priceTable } from "#infrastructure/drizzle-price-table"

type DrizzlePriceBookOptions = {
  db: BaseSQLiteDatabase<"sync" | "async", unknown>
}

export class DrizzlePriceBook extends PriceBook {
  private readonly db: BaseSQLiteDatabase<"sync" | "async", unknown>

  constructor(options: DrizzlePriceBookOptions) {
    super()
    this.db = options.db
  }

  override async find(run: PricedRun): Promise<Cost | null> {
    const [row] = await this.db
      .select({ costAmount: priceTable.costAmount })
      .from(priceTable)
      .where(
        and(
          eq(priceTable.model, run.model),
          eq(priceTable.settings, run.settings)
        )
      )
      .limit(1)
    return row === undefined
      ? null
      : { amount: row.costAmount, currency: "USD" }
  }

  override async keep(price: MeasuredPrice): Promise<void> {
    const values = {
      model: price.model,
      settings: price.settings,
      costAmount: price.cost.amount,
      measuredAt: price.measuredAt.getTime(),
    }
    await this.db
      .insert(priceTable)
      .values(values)
      .onConflictDoUpdate({
        target: [priceTable.model, priceTable.settings],
        set: { costAmount: values.costAmount, measuredAt: values.measuredAt },
      })
  }
}
