type GatewayRefusedErrorOptions = {
  code: string
  status: number
  retryAfterSeconds: number | null
}

export class GatewayRefusedError extends Error {
  static readonly lockCodes: readonly string[] = [
    "OWNER_TOKEN_MISSING",
    "OWNER_TOKEN_MISMATCH",
  ]

  readonly code: string
  readonly status: number
  readonly retryAfterSeconds: number | null

  constructor(options: GatewayRefusedErrorOptions) {
    super(`The gateway answered ${options.status} with ${options.code}`)
    this.name = "GatewayRefusedError"
    this.code = options.code
    this.status = options.status
    this.retryAfterSeconds = options.retryAfterSeconds
  }

  isLock(): boolean {
    return (
      this.status === 401 && GatewayRefusedError.lockCodes.includes(this.code)
    )
  }
}
