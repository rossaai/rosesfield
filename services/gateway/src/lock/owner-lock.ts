import {
  localhostAllowedHostnames,
  localhostAllowedOrigins,
  validateHostHeader,
  validateOriginHeader,
} from "@modelcontextprotocol/server"
import type { ErrorEnvelope } from "@rosesfield/contract"
import type { Context, MiddlewareHandler } from "hono"
import type { OwnerLock } from "#env"
import type { TokenTries } from "#lock/token-tries"

type Refusal = {
  status: 401 | 403 | 429
  code: string
}

export type OwnerLockOptions = {
  lock: OwnerLock
  tries: TokenTries
  clientOf: (c: Context) => string | null
}

const bearerPattern = /^Bearer[ \t]+(\S+)[ \t]*$/i

const refusals = {
  tokenMissing: { status: 401, code: "OWNER_TOKEN_MISSING" },
  tokenMismatch: { status: 401, code: "OWNER_TOKEN_MISMATCH" },
  hostRefused: { status: 403, code: "HOST_REFUSED" },
  originRefused: { status: 403, code: "ORIGIN_REFUSED" },
  tooManyTries: { status: 429, code: "OWNER_TOKEN_TRIES" },
} satisfies Record<string, Refusal>

export const unknownClient = "unknown"

export function ownerLock(options: OwnerLockOptions): MiddlewareHandler {
  const { lock } = options
  return lock.mode === "local" ? localLock() : tokenLock(lock.token, options)
}

function localLock(): MiddlewareHandler {
  const hostnames = localhostAllowedHostnames()
  const origins = localhostAllowedOrigins()
  return async (c, next) => {
    const host = c.req.header("host") ?? new URL(c.req.url).host
    if (!validateHostHeader(host, hostnames).ok) {
      return refuse(c, refusals.hostRefused)
    }
    if (!validateOriginHeader(c.req.header("origin"), origins).ok) {
      return refuse(c, refusals.originRefused)
    }
    return next()
  }
}

function tokenLock(
  token: string,
  options: OwnerLockOptions
): MiddlewareHandler {
  const expected = digestOf(token)
  const { tries } = options
  return async (c, next) => {
    const given = bearerPattern.exec(c.req.header("authorization") ?? "")?.[1]
    if (given === undefined) {
      return refuse(c, refusals.tokenMissing)
    }
    const client = options.clientOf(c) ?? unknownClient
    const wait = tries.retryAfterSeconds(client)
    if (wait !== null) {
      c.header("Retry-After", String(wait))
      return refuse(c, refusals.tooManyTries)
    }
    if (!isSameDigest(await expected, await digestOf(given))) {
      tries.fail(client)
      return refuse(c, refusals.tokenMismatch)
    }
    tries.succeed(client)
    return next()
  }
}

function refuse(c: Context, refusal: Refusal): Response {
  const body: ErrorEnvelope = {
    error: { code: refusal.code, status: refusal.status },
  }
  if (refusal.status === 401) {
    c.header("WWW-Authenticate", 'Bearer realm="rosesfield"')
  }
  return c.json(body, refusal.status)
}

async function digestOf(text: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(text)
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
}

function isSameDigest(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return difference === 0
}
