import type { Context, MiddlewareHandler } from "hono"
import { generateSignedCookie, getSignedCookie } from "hono/cookie"
import type { GatewayEnv } from "#gateway-env"
import type { AccountLookups } from "#session/account-lookups"
import type { SessionId } from "#session/session-scope"
import type { SessionVisits } from "#session/session-visits"
import { readVisitorKeys } from "#session/visitor-keys"

export type SessionGuardOptions = {
  secret: string
  retentionDays: number
  take: (sessionId: SessionId) => Promise<void>
  accounts: AccountLookups
  visits: SessionVisits
}

type HeldSession = {
  sessionId: SessionId
  tag: string | null
}

type Visit = HeldSession & {
  isNew: boolean
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const accountPattern = /^a-[0-9a-f]{64}$/
const tagPattern = /^[0-9a-f]{16}$/

export const sessionCookie = {
  name: "rosesfield_session",
  daySeconds: 86_400,
  tagMark: "~",
}

export function isSessionId(value: unknown): value is SessionId {
  return (
    typeof value === "string" &&
    (uuidPattern.test(value) || accountPattern.test(value))
  )
}

export function isAccountSession(sessionId: SessionId): boolean {
  return accountPattern.test(sessionId)
}

function hexOf(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function accountSessionOf(accountId: string): Promise<SessionId> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(accountId)
  )
  return `a-${hexOf(digest)}`
}

export async function keyTagOf(secret: string, key: string): Promise<string> {
  const hmac = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signed = await crypto.subtle.sign(
    "HMAC",
    hmac,
    new TextEncoder().encode(`engine-key\n${key}`)
  )
  return hexOf(signed).slice(0, 16)
}

function heldOf(value: unknown): HeldSession | null {
  if (typeof value !== "string") {
    return null
  }
  const [sessionId, tag, ...rest] = value.split(sessionCookie.tagMark)
  if (rest.length > 0 || !isSessionId(sessionId)) {
    return null
  }
  if (isAccountSession(sessionId)) {
    return tag !== undefined && tagPattern.test(tag) ? { sessionId, tag } : null
  }
  return tag === undefined ? { sessionId, tag: null } : null
}

async function visitWithKey(
  options: SessionGuardOptions,
  held: HeldSession | null,
  key: string
): Promise<Visit> {
  const tag = await keyTagOf(options.secret, key)
  if (held !== null && held.tag === tag) {
    return { ...held, isNew: false }
  }
  const answer = await options.accounts.answerFor(tag, key)
  if (answer.state !== "found") {
    return held === null
      ? { sessionId: crypto.randomUUID(), tag: null, isNew: true }
      : { ...held, isNew: false }
  }
  const sessionId = await accountSessionOf(answer.id)
  if (held !== null && !isAccountSession(held.sessionId)) {
    await options.visits.move(held.sessionId, sessionId)
  }
  return { sessionId, tag, isNew: true }
}

async function visitOf(
  options: SessionGuardOptions,
  c: Context
): Promise<Visit> {
  const signed = await getSignedCookie(c, options.secret, sessionCookie.name)
  const held = heldOf(signed)
  const key = readVisitorKeys(c).engine
  if (key !== null) {
    return visitWithKey(options, held, key)
  }
  return held === null
    ? { sessionId: crypto.randomUUID(), tag: null, isNew: true }
    : { ...held, isNew: false }
}

function cookieValue(visit: Visit): string {
  return visit.tag === null
    ? visit.sessionId
    : `${visit.sessionId}${sessionCookie.tagMark}${visit.tag}`
}

export function sessionGuard(
  options: SessionGuardOptions
): MiddlewareHandler<GatewayEnv> {
  return async (c, next) => {
    const visit = await visitOf(options, c)
    const isFresh =
      isAccountSession(visit.sessionId) || !visit.isNew
        ? await options.visits.touch(visit.sessionId)
        : false
    const cookie =
      visit.isNew || isFresh
        ? await generateSignedCookie(
            sessionCookie.name,
            cookieValue(visit),
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
    c.set("session", visit.sessionId)
    try {
      await options.take(visit.sessionId)
      await next()
    } finally {
      if (cookie !== null) {
        c.header("set-cookie", cookie, { append: true })
      }
    }
  }
}
