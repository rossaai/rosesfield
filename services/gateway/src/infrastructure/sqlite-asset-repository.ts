import {
  type Asset,
  type AssetPlace,
  asset as assetSchema,
} from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import {
  type AssetCursor,
  type AssetPage,
  AssetRepository,
  assetTable,
} from "@rosesfield/library"
import { and, desc, eq, lt, or, type SQL } from "drizzle-orm"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import type { SessionScope } from "#session/session-scope"

export type AssetRow = typeof assetTable.$inferSelect

type SqliteAssetRepositoryOptions = {
  db: SqliteDatabase
  scope: SessionScope | null
}

export class SqliteAssetRepository extends AssetRepository {
  private readonly db: SqliteDatabase
  private readonly scope: SessionScope | null

  constructor(options: SqliteAssetRepositoryOptions) {
    super()
    this.db = options.db
    this.scope = options.scope
  }

  override async add(
    asset: Asset,
    place: AssetPlace = "library"
  ): Promise<void> {
    const createdAt = Date.parse(asset.createdAt)
    await this.scope?.claim("asset", asset.id, createdAt)
    await this.db.insert(assetTable).values({
      id: asset.id,
      kind: asset.kind,
      mime: asset.mime,
      bytes: asset.bytes,
      width: asset.width,
      height: asset.height,
      durationSeconds: asset.durationSeconds,
      sourceRunId: asset.sourceRunId,
      place,
      createdAt,
    })
  }

  override async get(id: AssetId): Promise<Asset | null> {
    const rows = await this.db
      .select()
      .from(assetTable)
      .where(this.within(eq(assetTable.id, id)))
    const row = rows[0]
    return row === undefined ? null : assetOfRow(row)
  }

  override async list(page: AssetPage): Promise<Asset[]> {
    const conditions: SQL[] = [eq(assetTable.place, "library")]
    if (page.kind !== null) {
      conditions.push(eq(assetTable.kind, page.kind))
    }
    if (page.before !== null) {
      conditions.push(before(page.before))
    }
    const rows = await this.db
      .select()
      .from(assetTable)
      .where(this.within(...conditions))
      .orderBy(desc(assetTable.createdAt), desc(assetTable.id))
      .limit(page.limit)
    return rows.map(assetOfRow)
  }

  override async delete(id: AssetId): Promise<void> {
    await this.db.delete(assetTable).where(this.within(eq(assetTable.id, id)))
  }

  private within(...conditions: SQL[]): SQL | undefined {
    const owned = this.scope?.owns("asset", assetTable.id)
    return and(...conditions, ...(owned === undefined ? [] : [owned]))
  }
}

function before(cursor: AssetCursor): SQL {
  const time = cursor.createdAt.getTime()
  const condition = or(
    lt(assetTable.createdAt, time),
    and(eq(assetTable.createdAt, time), lt(assetTable.id, cursor.id))
  )
  if (condition === undefined) {
    throw new TypeError("A cursor condition needs its two parts")
  }
  return condition
}

export function assetOfRow({ place: _place, ...row }: AssetRow): Asset {
  return assetSchema.parse({
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
  })
}
