import type { Clock } from "@rosesfield/kernel"
import type { AccountAnswer } from "#session/comfy-account"

type Held = {
  answer: Promise<AccountAnswer>
  at: number
}

type AccountLookupsOptions = {
  lookup: (key: string) => Promise<AccountAnswer>
  clock: Clock
}

export class AccountLookups {
  static readonly keepMs = 300_000

  private readonly lookup: (key: string) => Promise<AccountAnswer>
  private readonly clock: Clock
  private readonly held = new Map<string, Held>()

  constructor(options: AccountLookupsOptions) {
    this.lookup = options.lookup
    this.clock = options.clock
  }

  answerFor(tag: string, key: string): Promise<AccountAnswer> {
    const now = this.clock.now().getTime()
    for (const [one, held] of this.held) {
      if (now - held.at >= AccountLookups.keepMs) {
        this.held.delete(one)
      }
    }
    const found = this.held.get(tag)
    if (found !== undefined) {
      return found.answer
    }
    const answer = this.lookup(key).then((result) => {
      if (result.state !== "found") {
        this.held.delete(tag)
      }
      return result
    })
    this.held.set(tag, { answer, at: now })
    return answer
  }
}
