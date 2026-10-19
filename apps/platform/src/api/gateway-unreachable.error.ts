type GatewayUnreachableErrorOptions = {
  cause: unknown
}

export class GatewayUnreachableError extends Error {
  readonly code = "NETWORK"

  constructor(options: GatewayUnreachableErrorOptions) {
    super("The gateway did not answer", { cause: options.cause })
    this.name = "GatewayUnreachableError"
  }
}
