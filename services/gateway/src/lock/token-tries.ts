import type { Clock } from "@rosesfield/kernel"

type Failures = {
  count: number
  windowStart: number
}

type TokenTriesOptions = {
  clock: Clock
}

export class TokenTries {
  static readonly maxTries = 10
  static readonly windowMs = 15 * 60_000
  static readonly maxClients = 10_000

  private readonly clock: Clock
  private readonly failures = new Map<string, Failures>()

  constructor(options: TokenTriesOptions) {
    this.clock = options.clock
  }

  retryAfterSeconds(client: string): number | null {
    const failures = this.current(client)
    if (failures === null || failures.count < TokenTries.maxTries) {
      return null
    }
    const end = failures.windowStart + TokenTries.windowMs
    return Math.max(1, Math.ceil((end - this.clock.now().getTime()) / 1000))
  }

  fail(client: string): void {
    const failures = this.current(client) ?? {
      count: 0,
      windowStart: this.clock.now().getTime(),
    }
    if (
      !this.failures.has(client) &&
      this.failures.size >= TokenTries.maxClients
    ) {
      this.forgetExpired()
    }
    this.failures.set(client, { ...failures, count: failures.count + 1 })
  }

  succeed(client: string): void {
    this.failures.delete(client)
  }

  private current(client: string): Failures | null {
    const failures = this.failures.get(client)
    if (failures === undefined) {
      return null
    }
    if (this.isExpired(failures)) {
      this.failures.delete(client)
      return null
    }
    return failures
  }

  private isExpired(failures: Failures): boolean {
    return (
      this.clock.now().getTime() - failures.windowStart >= TokenTries.windowMs
    )
  }

  private forgetExpired(): void {
    for (const [client, failures] of this.failures) {
      if (this.isExpired(failures)) {
        this.failures.delete(client)
      }
    }
    if (this.failures.size >= TokenTries.maxClients) {
      const oldest = this.failures.keys().next()
      if (oldest.done !== true) {
        this.failures.delete(oldest.value)
      }
    }
  }
}
