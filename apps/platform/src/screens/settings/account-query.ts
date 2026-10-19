import { queryOptions } from "@tanstack/react-query"
import { fieldOf, invalidResponse, oneOf } from "@/api/call-path"
import { credentialHeaders, refusalOf } from "@/api/call-route"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import { engineKeyHeader } from "@/api/visitor-keys"

export type KeyStatus =
  | "missing"
  | "valid"
  | "wrong"
  | "no-plan"
  | "outside-workspace"
  | "unreachable"

export type SpendCap = {
  credits: number
  left: number
}

export type Account = {
  key: KeyStatus
  credits: number | null
  retentionDays: number | null
  cap: SpendCap | null
}

export const keyStatuses: readonly KeyStatus[] = [
  "missing",
  "valid",
  "wrong",
  "no-plan",
  "outside-workspace",
  "unreachable",
]

export const accountPath = "/api/account"

function numberOrNull(value: unknown): number | null | undefined {
  if (value === null) {
    return null
  }
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function capOf(value: unknown): SpendCap | null | undefined {
  if (value === null) {
    return null
  }
  const credits = numberOrNull(fieldOf(value, "credits"))
  const left = numberOrNull(fieldOf(value, "left"))
  return typeof credits === "number" && typeof left === "number"
    ? { credits, left }
    : undefined
}

export function readAccount(body: unknown): Account | null {
  const account = fieldOf(body, "account")
  const key = oneOf(fieldOf(account, "key"), keyStatuses)
  const credits = numberOrNull(fieldOf(account, "credits"))
  const retentionDays = numberOrNull(fieldOf(account, "retentionDays"))
  const cap = capOf(fieldOf(account, "cap"))
  if (
    key === null ||
    credits === undefined ||
    retentionDays === undefined ||
    cap === undefined
  ) {
    return null
  }
  return { key, credits, retentionDays, cap }
}

async function fetchAccount(
  headers: Record<string, string>,
  signal: AbortSignal | undefined
): Promise<Account> {
  let response: Response
  try {
    response = await fetch(accountPath, {
      headers: { Accept: "application/json", ...headers },
      ...(signal === undefined ? {} : { signal }),
    })
  } catch (error) {
    throw new GatewayUnreachableError({ cause: error })
  }
  if (!response.ok) {
    throw await refusalOf(response)
  }
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

export function checkKey(key: string): Promise<Account> {
  return fetchAccount(
    { ...credentialHeaders(), [engineKeyHeader]: key },
    undefined
  )
}
