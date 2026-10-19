import { InvalidArgumentError } from "@rosesfield/kernel"

type AssetInvalidErrorOptions = {
  issues: readonly string[]
}

export class AssetInvalidError extends InvalidArgumentError {
  override readonly code = "ASSET_INVALID"

  constructor(options: AssetInvalidErrorOptions) {
    super({
      message: `The asset breaks the rules: ${options.issues.join(". ")}`,
    })
  }
}
