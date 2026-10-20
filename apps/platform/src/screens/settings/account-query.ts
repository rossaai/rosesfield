import {
  type AccountStatus,
  accountResponse,
  accountRoutes,
  type KeyStatus,
  type SpendCapStatus,
} from "@rosesfield/contract"
import { queryOptions } from "@tanstack/react-query"
import { invalidResponse } from "@/api/call-path"
import { credentialHeaders, refusalOf } from "@/api/call-route"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import { engineKeyHeader } from "@/api/visitor-keys"

export type { KeyStatus }

export type SpendCap = SpendCapStatus

export type Account = AccountStatus

export const accountPath = accountRoutes.getAccount.path

export function readAccount(body: unknown): Account | null {
  const parsed = accountResponse.safeParse(body)
  return parsed.success ? parsed.data.account : null
}

async function call(
  method: string,
  headers: Record<string, string>,
  signal: AbortSignal | undefined
): Promise<Response> {
  let response: Response
  try {
    response = await fetch(accountPath, {
      method,
      headers: { Accept: "application/json", ...headers },
      ...(signal === undefined ? {} : { signal }),
    })
  } catch (error) {
    throw new GatewayUnreachableError({ cause: error })
  }
  if (!response.ok) {
    throw await refusalOf(response)
  }
  return response
}

async function fetchAccount(
  headers: Record<string, string>,
  signal: AbortSignal | undefined
): Promise<Account> {
  const response = await call(accountRoutes.getAccount.method, headers, signal)
  const account = readAccount(await response.json().catch(() => null))
  if (account === null) {
    throw invalidResponse(response.status)
  }
  return account
}

export const accountQuery = queryOptions({
  queryKey: ["settings", "account"],
  queryFn: ({ signal }) => fetchAccount(credentialHeaders(), signal),
  staleTime: 60_000,
})

export const keyCheckLimitMs = 10_000

export async function checkKey(key: string): Promise<Account> {
  const stop = new AbortController()
  const timer = setTimeout(() => stop.abort(), keyCheckLimitMs)
  try {
    return await fetchAccount(
      { ...credentialHeaders(), [engineKeyHeader]: key },
      stop.signal
    )
  } finally {
    clearTimeout(timer)
  }
}

export async function forgetAccount(): Promise<void> {
  await call(accountRoutes.forgetAccount.method, credentialHeaders(), undefined)
}
