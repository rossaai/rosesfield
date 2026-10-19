import { credentialHeaders, isAbort, refusalOf } from "@/api/call-route"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"

export type CallPathOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE"
  path: string
  body?: unknown
  accept?: string
  signal?: AbortSignal | undefined
}

export function fieldOf(value: unknown, name: string): unknown {
  return typeof value === "object" && value !== null
    ? Object.entries(value).find(([key]) => key === name)?.[1]
    : undefined
}

export function oneOf<Value extends string>(
  value: unknown,
  options: readonly Value[]
): Value | null {
  return options.find((option) => option === value) ?? null
}

export function invalidResponse(status: number): GatewayRefusedError {
  return new GatewayRefusedError({
    code: "RESPONSE_INVALID",
    status,
    retryAfterSeconds: null,
  })
}

function initOf(options: CallPathOptions): RequestInit {
  const hasBody = options.body !== undefined
  return {
    method: options.method,
    headers: {
      Accept: options.accept ?? "application/json",
      ...credentialHeaders(),
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  }
}

export async function callPath(options: CallPathOptions): Promise<Response> {
  let response: Response
  try {
    response = await fetch(options.path, initOf(options))
  } catch (error) {
    if (isAbort(error)) {
      throw error
    }
    throw new GatewayUnreachableError({ cause: error })
  }
  if (!response.ok) {
    throw await refusalOf(response)
  }
  return response
}

export async function callPathFor<Value>(
  options: CallPathOptions,
  read: (body: unknown) => Value | null
): Promise<Value> {
  const response = await callPath(options)
  const body: unknown = await response.json().catch(() => null)
  const value = read(body)
  if (value === null) {
    throw invalidResponse(response.status)
  }
  return value
}
