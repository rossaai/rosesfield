import type { Character as CharacterRecord } from "@rosesfield/contract"
import type { CharacterRepository } from "#domain/character.repository"

export type ListCharactersOutput = {
  characters: CharacterRecord[]
}

type ListCharactersHandlerOptions = {
  characters: CharacterRepository
}

export class ListCharactersHandler {
  private readonly characters: CharacterRepository

  constructor(options: ListCharactersHandlerOptions) {
    this.characters = options.characters
  }

  async execute(): Promise<ListCharactersOutput> {
    const characters = await this.characters.list()
    return { characters: characters.map((character) => character.toRecord()) }
  }
}
