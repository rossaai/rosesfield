import type {
  Character as CharacterRecord,
  UpdateCharacterBody,
} from "@rosesfield/contract"
import { characterIdFormat } from "@rosesfield/kernel"
import { checkReferences } from "#application/check-references"
import type { AssetRepository } from "#domain/asset.repository"
import type { CharacterRepository } from "#domain/character.repository"
import { CharacterNotFoundError } from "#domain/error/character-not-found.error"

export type UpdateCharacterInput = {
  characterId: string
  changes: UpdateCharacterBody
}

export type UpdateCharacterOutput = {
  character: CharacterRecord
}

type UpdateCharacterHandlerOptions = {
  characters: CharacterRepository
  assets: AssetRepository
}

export class UpdateCharacterHandler {
  private readonly characters: CharacterRepository
  private readonly assets: AssetRepository

  constructor(options: UpdateCharacterHandlerOptions) {
    this.characters = options.characters
    this.assets = options.assets
  }

  async execute(input: UpdateCharacterInput): Promise<UpdateCharacterOutput> {
    const character = await this.characters.get(
      characterIdFormat.parse(input.characterId)
    )
    if (character === null) {
      throw new CharacterNotFoundError({ characterId: input.characterId })
    }
    const { name, references, notes } = input.changes
    character.change({
      ...(name === undefined ? {} : { name }),
      ...(notes === undefined ? {} : { notes }),
      ...(references === undefined
        ? {}
        : { references: await checkReferences(this.assets, references) }),
    })
    await this.characters.save(character)
    return { character: character.toRecord() }
  }
}
