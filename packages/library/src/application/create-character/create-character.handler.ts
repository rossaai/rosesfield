import type {
  Character as CharacterRecord,
  CreateCharacterBody,
} from "@rosesfield/contract"
import { type Clock, characterIdFormat } from "@rosesfield/kernel"
import { checkReferences } from "#application/check-references"
import type { AssetRepository } from "#domain/asset.repository"
import { Character } from "#domain/character"
import type { CharacterRepository } from "#domain/character.repository"

export type CreateCharacterInput = CreateCharacterBody

export type CreateCharacterOutput = {
  character: CharacterRecord
}

type CreateCharacterHandlerOptions = {
  characters: CharacterRepository
  assets: AssetRepository
  clock: Clock
}

export class CreateCharacterHandler {
  private readonly characters: CharacterRepository
  private readonly assets: AssetRepository
  private readonly clock: Clock

  constructor(options: CreateCharacterHandlerOptions) {
    this.characters = options.characters
    this.assets = options.assets
    this.clock = options.clock
  }

  async execute(input: CreateCharacterInput): Promise<CreateCharacterOutput> {
    const character = Character.create({
      id: characterIdFormat.parse(crypto.randomUUID()),
      name: input.name,
      references: await checkReferences(this.assets, input.references),
      notes: input.notes,
      now: this.clock.now(),
    })
    await this.characters.add(character)
    return { character: character.toRecord() }
  }
}
