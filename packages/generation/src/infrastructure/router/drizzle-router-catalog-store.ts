import { eq, inArray, lt } from "drizzle-orm"
import {
  type BaseSQLiteDatabase,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"
import { z } from "zod"

export type CatalogSource = "keyed" | "public"

export type CatalogDatabase = BaseSQLiteDatabase<"sync" | "async", unknown>

export type KeptListing = {
  ids: readonly string[]
  checkedAt: number
}

export type KeptSchema = {
  model: string
  document: unknown
  etag: string | null
  source: CatalogSource
  checkedAt: number
}

export const routerListingTable = sqliteTable("router_listings", {
  keyTag: text("key_tag").primaryKey(),
  models: text("models").notNull(),
  checkedAt: integer("checked_at").notNull(),
  readAt: integer("read_at").notNull(),
})

export const routerSchemaTable = sqliteTable("router_schemas", {
  model: text("model").primaryKey(),
  document: text("document").notNull(),
  etag: text("etag"),
  source: text("source", { enum: ["keyed", "public"] }).notNull(),
  checkedAt: integer("checked_at").notNull(),
})

const modelIds = z.array(z.string())

type DrizzleRouterCatalogStoreOptions = {
  db: CatalogDatabase
}

export class DrizzleRouterCatalogStore {
  static readonly idsPerRead = 90

  private readonly db: CatalogDatabase

  constructor(options: DrizzleRouterCatalogStoreOptions) {
    this.db = options.db
  }

  async listing(keyTag: string): Promise<KeptListing | null> {
    const [row] = await this.db
      .select({
        models: routerListingTable.models,
        checkedAt: routerListingTable.checkedAt,
      })
      .from(routerListingTable)
      .where(eq(routerListingTable.keyTag, keyTag))
      .limit(1)
    if (row === undefined) {
      return null
    }
    const ids = modelIds.safeParse(parsedJson(row.models))
    return ids.success ? { ids: ids.data, checkedAt: row.checkedAt } : null
  }

  async schemas(ids: readonly string[]): Promise<KeptSchema[]> {
    const size = DrizzleRouterCatalogStore.idsPerRead
    const chunks: string[][] = []
    for (let at = 0; at < ids.length; at += size) {
      chunks.push(ids.slice(at, at + size))
    }
    const reads = await Promise.all(
      chunks.map((chunk) =>
        this.db
          .select()
          .from(routerSchemaTable)
          .where(inArray(routerSchemaTable.model, chunk))
      )
    )
    return reads.flat().map((row) => ({
      model: row.model,
      document: parsedJson(row.document),
      etag: row.etag,
      source: row.source,
      checkedAt: row.checkedAt,
    }))
  }

  async keepListing(keyTag: string, listing: KeptListing): Promise<void> {
    const values = {
      keyTag,
      models: JSON.stringify(listing.ids),
      checkedAt: listing.checkedAt,
      readAt: listing.checkedAt,
    }
    await this.db
      .insert(routerListingTable)
      .values(values)
      .onConflictDoUpdate({
        target: routerListingTable.keyTag,
        set: {
          models: values.models,
          checkedAt: values.checkedAt,
          readAt: values.readAt,
        },
      })
  }

  async markRead(keyTag: string, readAt: number): Promise<void> {
    await this.db
      .update(routerListingTable)
      .set({ readAt })
      .where(eq(routerListingTable.keyTag, keyTag))
  }

  async forgetListing(keyTag: string): Promise<void> {
    await this.db
      .delete(routerListingTable)
      .where(eq(routerListingTable.keyTag, keyTag))
  }

  async forgetUnread(before: number): Promise<number> {
    const deleted = await this.db
      .delete(routerListingTable)
      .where(lt(routerListingTable.readAt, before))
      .returning({ keyTag: routerListingTable.keyTag })
    return deleted.length
  }

  async keepSchema(schema: KeptSchema): Promise<void> {
    const values = {
      model: schema.model,
      document: JSON.stringify(schema.document),
      etag: schema.etag,
      source: schema.source,
      checkedAt: schema.checkedAt,
    }
    await this.db
      .insert(routerSchemaTable)
      .values(values)
      .onConflictDoUpdate({
        target: routerSchemaTable.model,
        set: {
          document: values.document,
          etag: values.etag,
          source: values.source,
          checkedAt: values.checkedAt,
        },
      })
  }

  async markChecked(model: string, checkedAt: number): Promise<void> {
    await this.db
      .update(routerSchemaTable)
      .set({ checkedAt })
      .where(eq(routerSchemaTable.model, model))
  }
}

function parsedJson(text: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text)
    return parsed
  } catch {
    return null
  }
}
