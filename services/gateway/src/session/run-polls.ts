const polling = new Map<string, Promise<void>>()

export function pollOnce(
  runId: string,
  poll: () => Promise<void>
): Promise<void> {
  const held = polling.get(runId)
  if (held !== undefined) {
    return held
  }
  const started = poll().finally(() => polling.delete(runId))
  polling.set(runId, started)
  return started
}
