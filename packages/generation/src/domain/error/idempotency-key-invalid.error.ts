import { InvalidArgumentError } from "@rosesfield/kernel"

export class IdempotencyKeyInvalidError extends InvalidArgumentError {
  override readonly code = "IDEMPOTENCY_KEY_INVALID"

  constructor() {
    super({
      message:
        "An idempotency key holds 1 to 255 visible ASCII characters and no space",
    })
  }
}
