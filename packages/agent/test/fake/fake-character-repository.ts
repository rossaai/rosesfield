import type { AssetId, CharacterId } from "@rosesfield/kernel"
import { type Character, CharacterRepository } from "@rosesfield/library"

export class FakeCharacterRepository extends CharacterRepository {
  private readonly stored = new Map<CharacterId, Character>()

  override async add(character: Character): Promise<void> {
    this.stored.set(character.id, character)
  }

  override async save(character: Character): Promise<void> {
    this.stored.set(character.id, character)
  }

  override async get(id: CharacterId): Promise<Character | null> {
    return this.stored.get(id) ?? null
  }

  override async list(): Promise<Character[]> {
    return [...this.stored.values()]
  }

  override async listUsing(assetId: AssetId): Promise<Character[]> {
    return [...this.stored.values()].filter((character) =>
      character.references.includes(assetId)
    )
  }

  override async delete(id: CharacterId): Promise<void> {
    this.stored.delete(id)
  }
}
