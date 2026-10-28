import { getConnInfo } from "hono/bun"
import type { ServerEnv } from "#env"
import type { GatewayContext } from "#gateway"
import { headerClientOf } from "#session/client-slot"

function connectionClientOf(c: GatewayContext): string | null {
  try {
    return getConnInfo(c).remote.address ?? null
  } catch {
    return null
  }
}

export function clientOfEnv(
  env: ServerEnv
): (c: GatewayContext) => string | null {
  return env.clientAddressHeader === undefined
    ? connectionClientOf
    : headerClientOf(env.clientAddressHeader)
}
