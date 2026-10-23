import {
  buildPath,
  errorEnvelope,
  type PathParamName,
  type RouteDefinition,
  type RoutePayload,
} from "@rosesfield/contract"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import { readOwnerToken } from "@/api/owner-token"
import { visitorKeyHeaders } from "@/api/visitor-keys"

type StandardTypes<Schema> = Schema extends {
  readonly "~standard": { readonly types?: infer Types }
}
  ? NonNullable<Types>
  : never

export type SchemaInput<Schema> =
  StandardTypes<Schema> extends { readonly input: infer Input } ? Input : never

export type SchemaOutput<Schema> =
  StandardTypes<Schema> extends { readonly output: infer Output }
    ? Output
    : never

type PayloadOut<Payload extends RoutePayload> = Payload extends "bytes"
  ? Blob
  : Payload extends null
    ? null
    : SchemaOutput<Payload>

type PayloadIn<Payload extends RoutePayload> = Payload extends "bytes"
  ? Blob
  : SchemaInput<Payload>

export type RouteOutput<Route extends RouteDefinition> = PayloadOut<
  Route["response"]
>

type ParamsPart<Route extends RouteDefinition> = Route["params"] extends null
  ? { params?: undefined }
  : { params: Record<PathParamName<Route["path"]>, string> }

type QueryPart<Route extends RouteDefinition> = Route["query"] extends null
  ? { query?: undefined }
  : { query?: SchemaInput<Route["query"]> }

type BodyPart<Route extends RouteDefinition> = Route["body"] extends null
  ? { body?: undefined }
  : { body: PayloadIn<Route["body"]> }

export type RouteCall<Route extends RouteDefinition> = ParamsPart<Route> &
  QueryPart<Route> &
  BodyPart<Route> & {
    idempotencyKey?: string
    signal?: AbortSignal
  }

type LooseCall = {
  params?: Record<string, string> | undefined
  query?: object | undefined
  body?: unknown
  idempotencyKey?: string
  signal?: AbortSignal
}

function urlOf(route: RouteDefinition, call: LooseCall): string {
  const path = buildPath(route.path, call.params ?? {})
  const search = new URLSearchParams()
  for (const [name, value] of Object.entries(call.query ?? {})) {
    if (typeof value === "string" || typeof value === "number") {
      search.set(name, String(value))
    }
  }
  const query = search.toString()
  return query === "" ? path : `${path}?${query}`
}

export function credentialHeaders(): Record<string, string> {
  const token = readOwnerToken()
  return {
    ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    ...visitorKeyHeaders(),
  }
}

function requestOf(route: RouteDefinition, call: LooseCall): RequestInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...credentialHeaders(),
  }
  if (call.idempotencyKey !== undefined) {
    headers["Idempotency-Key"] = call.idempotencyKey
  }
  const init: RequestInit = { method: route.method, headers }
  if (call.signal !== undefined) {
    init.signal = call.signal
  }
  if (call.body instanceof Blob) {
    headers["Content-Type"] = call.body.type || "application/octet-stream"
    init.body = call.body
  } else if (call.body !== undefined) {
    headers["Content-Type"] = "application/json"
    init.body = JSON.stringify(call.body)
  }
  return init
}

function retryAfterOf(response: Response): number | null {
  const header = response.headers.get("retry-after")
  const seconds = header === null ? Number.NaN : Number(header)
  return Number.isFinite(seconds) ? seconds : null
}

export async function refusalOf(
  response: Response
): Promise<GatewayRefusedError> {
  const text = await response.text().catch(() => "")
  const parsed = errorEnvelope.safeParse(safeJson(text))
  return new GatewayRefusedError({
    code: parsed.success ? parsed.data.error.code : "SERVER_ERROR",
    status: response.status,
    retryAfterSeconds: retryAfterOf(response),
    inputs: parsed.success ? (parsed.data.error.inputs ?? []) : [],
  })
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (error) {
    if (isAbort(error)) {
      throw error
    }
    throw new GatewayUnreachableError({ cause: error })
  }
}

export function parsePayload(
  payload: RoutePayload,
  value: unknown,
  status: number
): unknown {
  if (payload === null || payload === "bytes") {
    return value
  }
  const parsed = payload.safeParse(value)
  if (!parsed.success) {
    throw new GatewayRefusedError({
      code: "RESPONSE_INVALID",
      status,
      retryAfterSeconds: null,
    })
  }
  return parsed.data
}

export function callRoute<Route extends RouteDefinition>(
  route: Route,
  call: RouteCall<Route>
): Promise<RouteOutput<Route>>
export async function callRoute(
  route: RouteDefinition,
  call: LooseCall
): Promise<unknown> {
  const response = await send(urlOf(route, call), requestOf(route, call))
  if (!response.ok) {
    throw await refusalOf(response)
  }
  if (route.response === null) {
    return null
  }
  if (route.response === "bytes") {
    return response.blob()
  }
  const json: unknown = await response.json()
  return parsePayload(route.response, json, response.status)
}
