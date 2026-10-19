import { ConflictError } from "@rosesfield/kernel"

type IdempotencyKeyReusedErrorOptions = {
  appId: string
}

export class IdempotencyKeyReusedError extends ConflictError {
  override readonly code = "IDEMPOTENCY_KEY_REUSED"

  constructor(options: IdempotencyKeyReusedErrorOptions) {
    super({
      message: `This idempotency key started a run of another app than ${options.appId}`,
    })
  }
}
