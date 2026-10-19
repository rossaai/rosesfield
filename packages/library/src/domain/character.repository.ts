import type { AssetId, CharacterId } from "@rosesfield/kernel"
import type { Character } from "#domain/character"

export abstract class CharacterRepository {
  /** Stores a new character. */
  abstract add(character: Character): Promise<void>

  /** Stores the changes of a character that exists. */
  abstract save(character: Character): Promise<void>

  /** Returns the character with this id, or null. */
  abstract get(id: CharacterId): Promise<Character | null>

  /** Lists every character, newest first. */
  abstract list(): Promise<Character[]>

  /** Lists the characters that keep this asset as a reference. */
  abstract listUsing(assetId: AssetId): Promise<Character[]>

  /** Deletes a character. */
  abstract delete(id: CharacterId): Promise<void>
}
