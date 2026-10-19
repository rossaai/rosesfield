import { InvalidArgumentError } from "@rosesfield/kernel"

type CharacterInvalidErrorOptions = {
  reason: string
}

export class CharacterInvalidError extends InvalidArgumentError {
  override readonly code = "CHARACTER_INVALID"

  constructor(options: CharacterInvalidErrorOptions) {
    super({ message: `The character breaks a rule: ${options.reason}` })
  }
}
