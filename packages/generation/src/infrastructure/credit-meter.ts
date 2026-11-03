import type { Cost } from "@rosesfield/contract"
import type { Clock } from "@rosesfield/kernel"

export type BalanceReader = {
  readonly hasKey: boolean
  keyTag(): Promise<string>
  balance(): Promise<number>
}

export type MeterTicket = {
  tag: string
  before: number | null
  isShared: boolean
  startedAt: number
}

type Finished = {
  credits: Promise<number | null>
  at: number
}

type CreditMeterOptions = {
  clock: Clock
  wait?: (ms: number) => Promise<void>
}

export class CreditMeter {
  static readonly creditsPerUsd = 211
  static readonly creditsPerCent = CreditMeter.creditsPerUsd / 100
  static readonly settleMs = 2000
  static readonly settleTries = 5
  static readonly heldMs = 600_000
  static readonly staleMs = 7_200_000

  private readonly clock: Clock
  private readonly wait: (ms: number) => Promise<void>
  private readonly open = new Map<string, Set<MeterTicket>>()
  private readonly held = new Map<string, Map<MeterTicket, number>>()
  private readonly byRef = new Map<string, MeterTicket>()
  private readonly deferred = new Set<string>()
  private readonly finished = new Map<string, Finished>()

  constructor(options: CreditMeterOptions) {
    this.clock = options.clock
    this.wait =
      options.wait ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  }

  static longestMs(readMs: number): number {
    return (
      (1 + CreditMeter.settleTries) * readMs +
      (CreditMeter.settleTries - 1) * CreditMeter.settleMs
    )
  }

  async start(reader: BalanceReader): Promise<MeterTicket | null> {
    if (!reader.hasKey) {
      return null
    }
    this.prune()
    const tag = await reader.keyTag()
    const running = this.open.get(tag) ?? new Set<MeterTicket>()
    const ticket: MeterTicket = {
      tag,
      before: null,
      isShared: running.size > 0,
      startedAt: this.now(),
    }
    for (const other of running) {
      other.isShared = true
    }
    running.add(ticket)
    this.open.set(tag, running)
    if (!ticket.isShared) {
      const before = await this.balanceOf(reader)
      if (this.isSettled(tag, before)) {
        this.held.delete(tag)
        ticket.before = before
      }
    }
    return ticket
  }

  bind(ticket: MeterTicket | null, ref: string): void {
    if (ticket !== null) {
      this.byRef.set(ref, ticket)
    }
  }

  drop(ticket: MeterTicket | null): void {
    if (ticket !== null) {
      this.open.get(ticket.tag)?.delete(ticket)
    }
  }

  dropRef(ref: string): void {
    this.drop(this.byRef.get(ref) ?? null)
    this.byRef.delete(ref)
    this.deferred.delete(ref)
  }

  deferRef(ref: string): boolean {
    if (!this.byRef.has(ref) || this.deferred.has(ref)) {
      return false
    }
    this.deferred.add(ref)
    return true
  }

  finishRef(reader: BalanceReader, ref: string): Promise<number | null> {
    const held = this.finished.get(ref)
    if (held !== undefined) {
      return held.credits
    }
    const ticket = this.byRef.get(ref) ?? null
    this.byRef.delete(ref)
    this.deferred.delete(ref)
    const credits = this.finish(reader, ticket).catch(() => null)
    this.finished.set(ref, { credits, at: this.now() })
    return credits
  }

  async finish(
    reader: BalanceReader,
    ticket: MeterTicket | null
  ): Promise<number | null> {
    if (ticket === null) {
      return null
    }
    let credits: number | null = null
    try {
      credits = await this.spentBy(reader, ticket)
      return credits
    } finally {
      this.drop(ticket)
      if (credits === null) {
        this.hold(ticket)
      }
    }
  }

  private hold(ticket: MeterTicket): void {
    const held = this.held.get(ticket.tag) ?? new Map<MeterTicket, number>()
    held.set(ticket, this.now())
    this.held.set(ticket.tag, held)
  }

  private isSettled(tag: string, balance: number | null): boolean {
    const held = this.held.get(tag)
    if (held === undefined) {
      return true
    }
    const [only] = held.keys()
    const before = held.size === 1 ? (only?.before ?? null) : null
    return balance !== null && before !== null && balance < before
  }

  private async spentBy(
    reader: BalanceReader,
    ticket: MeterTicket
  ): Promise<number | null> {
    const { before } = ticket
    let last: number | null = null
    for (let tries = 0; tries < CreditMeter.settleTries; tries += 1) {
      if (ticket.isShared || before === null) {
        return null
      }
      if (tries > 0) {
        await this.wait(CreditMeter.settleMs)
      }
      const after = await this.balanceOf(reader)
      if (after === null || ticket.isShared) {
        return null
      }
      if (after < before && after === last) {
        return creditsBetween(before, after)
      }
      last = after
    }
    return last !== null && before !== null && last < before
      ? creditsBetween(before, last)
      : null
  }

  private async balanceOf(reader: BalanceReader): Promise<number | null> {
    try {
      return await reader.balance()
    } catch {
      return null
    }
  }

  private prune(): void {
    const now = this.now()
    for (const [tag, running] of this.open) {
      for (const ticket of running) {
        if (now - ticket.startedAt >= CreditMeter.staleMs) {
          running.delete(ticket)
        }
      }
      if (running.size === 0) {
        this.open.delete(tag)
      }
    }
    for (const [ref, ticket] of this.byRef) {
      if (now - ticket.startedAt >= CreditMeter.staleMs) {
        this.byRef.delete(ref)
        this.deferred.delete(ref)
      }
    }
    for (const [tag, held] of this.held) {
      for (const [ticket, at] of held) {
        if (now - at >= CreditMeter.heldMs) {
          held.delete(ticket)
        }
      }
      if (held.size === 0) {
        this.held.delete(tag)
      }
    }
    for (const [ref, held] of this.finished) {
      if (now - held.at >= CreditMeter.staleMs) {
        this.finished.delete(ref)
      }
    }
  }

  private now(): number {
    return this.clock.now().getTime()
  }
}

function creditsBetween(before: number, after: number): number {
  const credits = (before - after) * CreditMeter.creditsPerCent
  return Math.round(credits * 1_000_000) / 1_000_000
}

export function costOfCredits(credits: number | null): Cost | null {
  return credits === null
    ? null
    : { amount: credits / CreditMeter.creditsPerUsd, currency: "USD" }
}

export function creditsOfCost(cost: Cost): number {
  return cost.amount * CreditMeter.creditsPerUsd
}
