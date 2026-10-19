import { InvalidArgumentError } from "@rosesfield/kernel"

type RunCursorInvalidErrorOptions = {
  cursor: string
}

export class RunCursorInvalidError extends InvalidArgumentError {
  override readonly code = "RUN_CURSOR_INVALID"

  constructor(options: RunCursorInvalidErrorOptions) {
    super({
      message: `${JSON.stringify(options.cursor.slice(0, 80))} is not a cursor this list returned`,
    })
  }
}
