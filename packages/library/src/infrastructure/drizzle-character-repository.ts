import { character as characterSchema } from "@rosesfield/contract"
import type { AssetId, CharacterId } from "@rosesfield/kernel"
import { desc, eq, sql } from "drizzle-orm"
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite"
import { Character } from "#domain/character"
import { CharacterRepository } from "#domain/character.repository"
import { characterTable } from "#infrastructure/drizzle-library-tables"

type CharacterRow = typeof characterTable.$inferSelect

type DrizzleCharacterRepositoryOptions = {
  db: BunSQLiteDatabase
}

export class DrizzleCharacterRepository extends CharacterRepository {
  private readonly db: BunSQLiteDatabase

  constructor(options: DrizzleCharacterRepositoryOptions) {
    super()
    this.db = options.db
  }

  override async add(character: Character): Promise<void> {
    await this.db.insert(characterTable).values(toRow(character))
  }

  override async save(character: Character): Promise<void> {
    const { id, ...changes } = toRow(character)
    await this.db
      .update(characterTable)
      .set(changes)
      .where(eq(characterTable.id, id))
  }

  override async get(id: CharacterId): Promise<Character | null> {
    const rows = await this.db
      .select()
      .from(characterTable)
      .where(eq(characterTable.id, id))
    const row = rows[0]
    return row === undefined ? null : fromRow(row)
  }

  override async list(): Promise<Character[]> {
    const rows = await this.db
      .select()
      .from(characterTable)
      .orderBy(desc(characterTable.createdAt), desc(characterTable.id))
    return rows.map(fromRow)
  }

  override async listUsing(assetId: AssetId): Promise<Character[]> {
    const rows = await this.db
      .select()
      .from(characterTable)
      .where(
        sql`exists (select 1 from json_each(${characterTable.references}) where json_each.value = ${assetId})`
      )
      .orderBy(desc(characterTable.createdAt))
    return rows.map(fromRow)
  }

  override async delete(id: CharacterId): Promise<void> {
    await this.db.delete(characterTable).where(eq(characterTable.id, id))
  }
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
