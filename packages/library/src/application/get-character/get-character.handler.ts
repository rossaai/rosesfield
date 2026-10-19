import type { Character as CharacterRecord } from "@rosesfield/contract"
import { characterIdFormat } from "@rosesfield/kernel"
import type { CharacterRepository } from "#domain/character.repository"
import { CharacterNotFoundError } from "#domain/error/character-not-found.error"

export type GetCharacterInput = {
  characterId: string
}

export type GetCharacterOutput = {
  character: CharacterRecord
}

type GetCharacterHandlerOptions = {
  characters: CharacterRepository
}

export class GetCharacterHandler {
  private readonly characters: CharacterRepository

  constructor(options: GetCharacterHandlerOptions) {
    this.characters = options.characters
  }

  async execute(input: GetCharacterInput): Promise<GetCharacterOutput> {
    const character = await this.characters.get(
      characterIdFormat.parse(input.characterId)
    )
    if (character === null) {
      throw new CharacterNotFoundError({ characterId: input.characterId })
    }
    return { character: character.toRecord() }
  }
}
