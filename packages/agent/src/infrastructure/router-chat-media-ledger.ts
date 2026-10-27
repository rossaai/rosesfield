import { routerMedia } from "#infrastructure/router-chat-media"

export type TurnCount = {
  count: number
  bytes: number
  counted: Set<string>
}

/** The media each turn has sent so far, kept across the requests of one harness, so the limit binds the turn and not one request. */
export type MediaLedger = {
  turns: Map<string, TurnCount>
}

export function mediaLedger(): MediaLedger {
  return { turns: new Map() }
}

/** The count of the turn that starts at the person's message `turnStart`, kept for the last `ledgerTurns` turns. */
export function turnOf(
  ledger: MediaLedger,
  messages: readonly Record<string, unknown>[],
  turnStart: number
): TurnCount {
  const key = `${turnStart}:${JSON.stringify(messages[turnStart] ?? null)}`
  const found = ledger.turns.get(key)
  if (found !== undefined) {
    return found
  }
  const turn: TurnCount = { count: 0, bytes: 0, counted: new Set() }
  ledger.turns.set(key, turn)
  for (const old of ledger.turns.keys()) {
    if (ledger.turns.size <= routerMedia.ledgerTurns) {
      break
    }
    ledger.turns.delete(old)
  }
  return turn
}

export function fits(turn: TurnCount, key: string, bytes: number): boolean {
  return (
    turn.counted.has(key) ||
    (turn.count < routerMedia.perTurn &&
      turn.bytes + bytes <= routerMedia.turnBytes)
  )
}

export function charge(turn: TurnCount, key: string, bytes: number): void {
  if (!turn.counted.has(key)) {
    turn.counted.add(key)
    turn.count += 1
    turn.bytes += bytes
  }
}
