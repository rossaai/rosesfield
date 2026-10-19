import { character as characterSchema } from "@rosesfield/contract"
import type { AssetId, CharacterId } from "@rosesfield/kernel"
import {
  Character,
  CharacterRepository,
  characterTable,
} from "@rosesfield/library"
import { and, desc, eq, type SQL, sql } from "drizzle-orm"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import type { SessionScope } from "#session/session-scope"

type CharacterRow = typeof characterTable.$inferSelect

type SqliteCharacterRepositoryOptions = {
  db: SqliteDatabase
  scope: SessionScope | null
}

export class SqliteCharacterRepository extends CharacterRepository {
  private readonly db: SqliteDatabase
  private readonly scope: SessionScope | null

  constructor(options: SqliteCharacterRepositoryOptions) {
    super()
    this.db = options.db
    this.scope = options.scope
  }

  override async add(character: Character): Promise<void> {
    const row = toRow(character)
    await this.scope?.claim("character", row.id, row.createdAt)
    await this.db.insert(characterTable).values(row)
  }

  override async save(character: Character): Promise<void> {
    const { id, ...changes } = toRow(character)
    await this.db
      .update(characterTable)
      .set(changes)
      .where(this.within(eq(characterTable.id, id)))
  }

  override async get(id: CharacterId): Promise<Character | null> {
    const rows = await this.db
      .select()
      .from(characterTable)
      .where(this.within(eq(characterTable.id, id)))
    const row = rows[0]
    return row === undefined ? null : fromRow(row)
  }

  override async list(): Promise<Character[]> {
    const rows = await this.db
      .select()
      .from(characterTable)
      .where(this.within())
      .orderBy(desc(characterTable.createdAt), desc(characterTable.id))
    return rows.map(fromRow)
  }

  override async listUsing(assetId: AssetId): Promise<Character[]> {
    const rows = await this.db
      .select()
      .from(characterTable)
      .where(this.within(referencing(assetId)))
      .orderBy(desc(characterTable.createdAt))
    return rows.map(fromRow)
  }

  override async delete(id: CharacterId): Promise<void> {
    await this.db
      .delete(characterTable)
      .where(this.within(eq(characterTable.id, id)))
  }

  private within(...conditions: SQL[]): SQL | undefined {
    const owned = this.scope?.owns("character", characterTable.id)
    return and(...conditions, ...(owned === undefined ? [] : [owned]))
  }
}

export function referencing(assetId: string): SQL {
  return sql`exists (select 1 from json_each(${characterTable.references}) where json_each.value = ${assetId})`
}

function toRow(character: Character): CharacterRow {
  const record = character.toRecord()
  return {
    id: record.id,
    name: record.name,
    references: record.references,
    notes: record.notes,
    createdAt: Date.parse(record.createdAt),
  }
}

function fromRow(row: CharacterRow): Character {
  return Character.restore(
    characterSchema.parse({
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
    })
  )
}
