import { NotFoundError } from "@rosesfield/kernel"

type CharacterNotFoundErrorOptions = {
  characterId: string
}

export class CharacterNotFoundError extends NotFoundError {
  override readonly code = "CHARACTER_NOT_FOUND"

  constructor(options: CharacterNotFoundErrorOptions) {
    super({
      message: `No character has the id ${options.characterId.slice(0, 80)}`,
    })
  }
}
