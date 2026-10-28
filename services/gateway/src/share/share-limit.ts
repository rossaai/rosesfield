import type { Clock } from "@rosesfield/kernel"
import type { Context } from "hono"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import { clientSlotOf } from "#session/client-slot"
import { SessionLimiter } from "#session/session-limiter"

export const shareRequestsPerMinute = 600

export function shareLimit(options: {
  db: SqliteDatabase
  clock: Clock
  clientOf: (c: Context) => string | null
}): (c: Context) => Promise<void> {
  const limiter = new SessionLimiter({
    db: options.db,
    clock: options.clock,
    requestsPerMinute: shareRequestsPerMinute,
  })
  return (c) => limiter.take(`share:${clientSlotOf(options.clientOf(c))}`)
}
