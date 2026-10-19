import { InvalidArgumentError } from "@rosesfield/kernel"

type CharacterReferenceInvalidErrorOptions = {
  assetId: string
}

export class CharacterReferenceInvalidError extends InvalidArgumentError {
  override readonly code = "CHARACTER_REFERENCE_INVALID"

  constructor(options: CharacterReferenceInvalidErrorOptions) {
    super({
      message: `Asset ${options.assetId.slice(0, 80)} is not an image in the library`,
    })
  }
}
