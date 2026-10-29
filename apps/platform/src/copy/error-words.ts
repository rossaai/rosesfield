import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import { RunStoppedError } from "@/api/run-stopped.error"
import { type CopyValues, t, tCatalog } from "@/copy/t"
import { type CopyKey, copy } from "@/copy.en"
import { readSpendCap } from "@/shell/spend-cap"

export type ErrorAct = "retry" | "settings" | "none"

export type ErrorWords = {
  title: string
  body: string
  action: { label: string; act: ErrorAct } | null
}

export type ErrorThing = "run" | "asset" | "character" | "conversation" | "app"

type ErrorContext = {
  minutes?: number
  thing?: ErrorThing
}

const rateLimitedCode = "ENGINE_RATE_LIMITED"

const settingsCodes: readonly string[] = [
  "ENGINE_KEY_INVALID",
  "ENGINE_BINDING_INVALID",
  "KEY_HEADER_INVALID",
  "SHARE_KEY_REQUIRED",
]

const capCode = "SPEND_CAP_REACHED"

export function codeOf(error: unknown): string {
  if (error instanceof GatewayRefusedError) {
    return error.code
  }
  if (error instanceof GatewayUnreachableError) {
    return error.code
  }
  if (error instanceof RunStoppedError) {
    return error.code
  }
  return "unknown"
}

function retryAfterOf(error: unknown): number {
  return error instanceof GatewayRefusedError
    ? (error.retryAfterSeconds ?? 0)
    : 0
}

function isCopyKey(key: string): key is CopyKey {
  return Object.hasOwn(copy, key)
}

function actOf(code: string): ErrorAct {
  return settingsCodes.includes(code) ? "settings" : "retry"
}

export function wordsForCode(
  code: string,
  context: ErrorContext & { seconds?: number } = {}
): ErrorWords {
  const cap = readSpendCap()
  const values: CopyValues = {
    minutes: context.minutes ?? 0,
    seconds: context.seconds ?? 0,
    thing: t(`noun.${context.thing ?? "app"}`),
    ...(cap === null ? {} : { cap }),
  }
  const base = code.endsWith("_NOT_FOUND")
    ? "error.notFound"
    : isCopyKey(`error.${code}.title`)
      ? `error.${code}`
      : "error.unknown"
  const actionKey = `${base}.action`
  const hasNoWait = code === rateLimitedCode && (context.seconds ?? 0) <= 0
  const titleKey =
    code === capCode && cap === null ? `${base}.titleNoCap` : `${base}.title`
  return {
    title: tCatalog(titleKey, values),
    body: hasNoWait
      ? t("error.ENGINE_RATE_LIMITED.bodyNoWait")
      : tCatalog(`${base}.body`, values),
    action: isCopyKey(actionKey)
      ? { label: t(actionKey), act: actOf(code) }
      : null,
  }
}

export function wordsForError(
  error: unknown,
  context: ErrorContext = {}
): ErrorWords {
  return wordsForCode(codeOf(error), {
    ...context,
    seconds: retryAfterOf(error),
  })
}
