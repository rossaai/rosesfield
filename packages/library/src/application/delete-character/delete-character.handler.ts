import { characterIdFormat } from "@rosesfield/kernel"
import type { CharacterRepository } from "#domain/character.repository"
import { CharacterNotFoundError } from "#domain/error/character-not-found.error"

export type DeleteCharacterInput = {
  characterId: string
}

type DeleteCharacterHandlerOptions = {
  characters: CharacterRepository
}

export class DeleteCharacterHandler {
  private readonly characters: CharacterRepository

  constructor(options: DeleteCharacterHandlerOptions) {
    this.characters = options.characters
  }

  async execute(input: DeleteCharacterInput): Promise<void> {
    const id = characterIdFormat.parse(input.characterId)
    if ((await this.characters.get(id)) === null) {
      throw new CharacterNotFoundError({ characterId: input.characterId })
    }
    await this.characters.delete(id)
  }
}
