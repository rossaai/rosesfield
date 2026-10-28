import { type Clock, SystemClock } from "@rosesfield/kernel"
import type { Context, MiddlewareHandler } from "hono"
import {
  deleteCookie,
  generateSignedCookie,
  getSignedCookie,
} from "hono/cookie"
import type { GatewayEnv } from "#gateway-env"
import { ContentLinks } from "#lock/content-links"
import type { AccountLookups } from "#session/account-lookups"
import { clientSlotOf } from "#session/client-slot"
import type { SessionId } from "#session/session-scope"
import type { SessionVisits } from "#session/session-visits"
import { readVisitorKeys } from "#session/visitor-keys"

export type SessionGuardOptions = {
  secret: string
  retentionDays: number
  take: (sessionId: SessionId) => Promise<void>
  open: (client: string) => Promise<void>
  address: (client: string) => Promise<void>
  clientOf: (c: Context) => string | null
  accounts: AccountLookups
  visits: SessionVisits
  early?: (request: Request, key: string) => void
  moveAgent?: (from: SessionId, to: SessionId) => Promise<void>
  clock?: Clock
}

type HeldSession = {
  sessionId: SessionId
  tag: string | null
}

type Visit = HeldSession & {
  isNew: boolean
  passing?: true
  minted?: true
  held?: SessionId
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const accountPattern = /^a-[0-9a-f]{64}$/
const tagPattern = /^[0-9a-f]{16}$/
const tooManyRequests = 429

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

function anonymousVisit(held: HeldSession | null): Visit {
  if (held === null) {
    return {
      sessionId: crypto.randomUUID(),
      tag: null,
      isNew: true,
      minted: true,
    }
  }
  return isAccountSession(held.sessionId)
    ? {
        sessionId: crypto.randomUUID(),
        tag: null,
        isNew: false,
        passing: true,
        held: held.sessionId,
      }
    : { ...held, isNew: false }
}

type Slots = {
  open: () => Promise<void>
  lookup: (sessionId: SessionId) => Promise<void>
  take: (sessionId: SessionId) => Promise<void>
}

function slotsOf(options: SessionGuardOptions, c: Context): Slots {
  const taken = new Set<string>()
  const once = async (key: string, take: (key: string) => Promise<void>) => {
    if (!taken.has(key)) {
      taken.add(key)
      await take(key)
    }
  }
  const opens = `opens:${clientSlotOf(options.clientOf(c))}`
  return {
    open: () => once(opens, options.open),
    lookup: (sessionId) => once(`lookups:${sessionId}`, options.open),
    take: (sessionId) => once(sessionId, options.take),
  }
}

async function takeVisit(slots: Slots, visit: Visit): Promise<Visit> {
  if (visit.minted === true) {
    await slots.open()
  }
  await slots.take(visit.held ?? visit.sessionId)
  return visit
}

async function visitWithKey(
  options: SessionGuardOptions,
  c: Context,
  slots: Slots,
  held: HeldSession | null,
  key: string
): Promise<Visit> {
  const tag = await keyTagOf(options.secret, key)
  if (held !== null && held.tag === tag) {
    return takeVisit(slots, { ...held, isNew: false })
  }
  if (held === null) {
    await slots.take(`key:${tag}`)
    if (!(await options.accounts.holds(key))) {
      await slots.open()
    }
  } else {
    await slots.take(held.sessionId)
    if (!(await options.accounts.holds(key))) {
      await slots.open()
      await slots.lookup(held.sessionId)
    }
  }
  options.early?.(c.req.raw, key)
  const answer = await options.accounts.answerFor(key)
  if (answer.state !== "found") {
    return takeVisit(slots, anonymousVisit(held))
  }
  const sessionId = await accountSessionOf(answer.id)
  await slots.take(sessionId)
  if (held !== null && !isAccountSession(held.sessionId)) {
    await options.visits.move(held.sessionId, sessionId)
    await options.moveAgent?.(held.sessionId, sessionId)
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
  const slots = slotsOf(options, c)
  if (key !== null) {
    return visitWithKey(options, c, slots, held, key)
  }
  return takeVisit(slots, anonymousVisit(held))
}

export async function forgetSession(c: Context): Promise<Response> {
  deleteCookie(c, sessionCookie.name, {
    path: "/",
    secure: new URL(c.req.url).protocol === "https:",
  })
  return c.body(null, 204)
}

function cookieValue(visit: Visit): string {
  return visit.tag === null
    ? visit.sessionId
    : `${visit.sessionId}${sessionCookie.tagMark}${visit.tag}`
}

export function sessionGuard(
  options: SessionGuardOptions
): MiddlewareHandler<GatewayEnv> {
  const links = new ContentLinks({
    secret: options.secret,
    clock: options.clock ?? new SystemClock(),
  })
  return async (c, next) => {
    await options.address(`address:${clientSlotOf(options.clientOf(c))}`)
    const linked = await linkedSession(links, c)
    if (linked !== null) {
      c.set("session", linked)
      c.set("signContent", (url) => links.sign(url, linked))
      await options.take(linked)
      return next()
    }
    const visit = await visitOf(options, c)
    const isFresh =
      visit.passing !== true &&
      (isAccountSession(visit.sessionId) || !visit.isNew)
        ? await options.visits.touch(visit.sessionId)
        : false
    c.set("session", visit.sessionId)
    c.set("signContent", (url) => links.sign(url, visit.sessionId))
    await next()
    if (
      visit.passing !== true &&
      (visit.isNew || isFresh) &&
      c.res.status !== tooManyRequests
    ) {
      c.header(
        "set-cookie",
        await generateSignedCookie(
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
        ),
        { append: true }
      )
    }
  }
}

async function linkedSession(
  links: ContentLinks,
  c: Context
): Promise<SessionId | null> {
  const holder = await links.holderOf(c.req.raw)
  return holder !== null && isSessionId(holder.sessionId)
    ? holder.sessionId
    : null
}
