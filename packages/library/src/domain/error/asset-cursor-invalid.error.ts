import { InvalidArgumentError } from "@rosesfield/kernel"

type AssetCursorInvalidErrorOptions = {
  cursor: string
}

export class AssetCursorInvalidError extends InvalidArgumentError {
  override readonly code = "ASSET_CURSOR_INVALID"

  constructor(options: AssetCursorInvalidErrorOptions) {
    super({
      message: `${JSON.stringify(options.cursor.slice(0, 80))} is not a cursor this list returned`,
    })
  }
}
