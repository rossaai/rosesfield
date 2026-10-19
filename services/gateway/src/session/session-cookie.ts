import type { MiddlewareHandler } from "hono"
import { generateSignedCookie, getSignedCookie } from "hono/cookie"
import type { GatewayEnv } from "#gateway-env"
import type { SessionId } from "#session/session-scope"

export type SessionGuardOptions = {
  secret: string
  retentionDays: number
  take: (sessionId: SessionId) => Promise<void>
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export const sessionCookie = {
  name: "rosesfield_session",
  daySeconds: 86_400,
}

export function isSessionId(value: unknown): value is SessionId {
  return typeof value === "string" && uuidPattern.test(value)
}

export function sessionGuard(
  options: SessionGuardOptions
): MiddlewareHandler<GatewayEnv> {
  return async (c, next) => {
    const signed = await getSignedCookie(c, options.secret, sessionCookie.name)
    const known = isSessionId(signed) ? signed : null
    const sessionId = known ?? crypto.randomUUID()
    const cookie =
      known === null
        ? await generateSignedCookie(
            sessionCookie.name,
            sessionId,
            options.secret,
            {
              path: "/",
              httpOnly: true,
              sameSite: "Lax",
              secure: new URL(c.req.url).protocol === "https:",
              maxAge: options.retentionDays * sessionCookie.daySeconds,
            }
          )
        : null
    c.set("session", sessionId)
    try {
      await options.take(sessionId)
      await next()
    } finally {
      if (cookie !== null) {
        c.header("set-cookie", cookie, { append: true })
      }
    }
  }
}
