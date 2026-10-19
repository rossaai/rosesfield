import type { Context } from "hono"
import type { GatewayApp } from "#gateway-env"
import type { ResponseOf } from "#routes/read-request"
import { type AccountStatus, accountRoutes } from "#session/account.contract"
import type { KeyProbe } from "#session/key-probe"
import { readVisitorKeys } from "#session/visitor-keys"

export type AccountReader = (c: Context) => Promise<AccountStatus>

export type CapReader = {
  read: () => Promise<{ credits: number; left: number } | null>
}

export function visitorAccount(options: {
  probe: KeyProbe
  retentionDays: number
}): AccountReader {
  return async (c) => {
    const key = readVisitorKeys(c).engine
    const reading =
      key === null
        ? { key: "missing" as const, credits: null }
        : await options.probe.read(key)
    return { ...reading, retentionDays: options.retentionDays, cap: null }
  }
}

export function ownerAccount(options: {
  probe: KeyProbe
  key: string | null
  cap: CapReader | null
}): AccountReader {
  return async () => {
    const { key, cap } = options
    const [reading, capped] = await Promise.all([
      key === null
        ? { key: "missing" as const, credits: null }
        : options.probe.read(key),
      cap === null ? null : cap.read(),
    ])
    return { ...reading, retentionDays: null, cap: capped }
  }
}

export function accountRoute(app: GatewayApp, read: AccountReader): void {
  const route = accountRoutes.getAccount
  app.get(route.path, async (c) => {
    const body: ResponseOf<typeof route> = { account: await read(c) }
    return c.json(body, route.status)
  })
}
