import type { Character as CharacterRecord } from "@rosesfield/contract"
import type { AssetId, CharacterId } from "@rosesfield/kernel"
import { CharacterInvalidError } from "#domain/error/character-invalid.error"

type CreateCharacterOptions = {
  id: CharacterId
  name: string
  references: readonly AssetId[]
  notes: string
  now: Date
}

type CharacterChanges = {
  name?: string
  references?: readonly AssetId[]
  notes?: string
}

export class Character {
  static readonly maxNameLength = 80
  static readonly maxReferences = 16
  static readonly maxNotesLength = 2000

  private record: CharacterRecord

  private constructor(record: CharacterRecord) {
    this.record = structuredClone(record)
  }

  static create(options: CreateCharacterOptions): Character {
    return new Character({
      id: options.id,
      name: Character.checkName(options.name),
      references: Character.checkReferences(options.references),
      notes: Character.checkNotes(options.notes),
      createdAt: options.now.toISOString(),
    })
  }

  static restore(record: CharacterRecord): Character {
    return new Character(record)
  }

  get id(): CharacterId {
    return this.record.id
  }

  get references(): readonly AssetId[] {
    return [...this.record.references]
  }

  get createdAt(): Date {
    return new Date(this.record.createdAt)
  }

  change(changes: CharacterChanges): void {
    this.record = {
      ...this.record,
      ...(changes.name === undefined
        ? {}
        : { name: Character.checkName(changes.name) }),
      ...(changes.references === undefined
        ? {}
        : { references: Character.checkReferences(changes.references) }),
      ...(changes.notes === undefined
        ? {}
        : { notes: Character.checkNotes(changes.notes) }),
    }
  }

  toRecord(): CharacterRecord {
    return structuredClone(this.record)
  }

  private static checkName(name: string): string {
    if (!/\S/.test(name)) {
      throw new CharacterInvalidError({ reason: "a name needs a letter" })
    }
    if (name.length > Character.maxNameLength) {
      throw new CharacterInvalidError({
        reason: `a name holds at most ${Character.maxNameLength} characters`,
      })
    }
    return name
  }

  private static checkReferences(references: readonly AssetId[]): AssetId[] {
    const unique = [...new Set(references)]
    if (unique.length === 0 || unique.length > Character.maxReferences) {
      throw new CharacterInvalidError({
        reason: `a character keeps 1 to ${Character.maxReferences} images`,
      })
    }
    return unique
  }

  private static checkNotes(notes: string): string {
    if (notes.length > Character.maxNotesLength) {
      throw new CharacterInvalidError({
        reason: `notes hold at most ${Character.maxNotesLength} characters`,
      })
    }
    return notes
  }
}
