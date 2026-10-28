import type { DeployOptions } from "./deploy-options"
import type { DeployTarget } from "./deploy-targets"
import type { Probe } from "./smoke-check"
import type { WranglerSession } from "./wrangler-session"

export type StepTools = {
  makeSecret: () => string
  fetch: (url: string, init: RequestInit) => Promise<Response>
  sleep: (ms: number) => Promise<void>
  print: (line: string) => void
  ask: (question: string) => Promise<string>
  build: () => Promise<void>
  login: (session: WranglerSession) => Promise<void>
  localComfyKey: string
  signal: AbortSignal
}

export type LoginStep = {
  text: string
  run: (session: WranglerSession, tools: StepTools) => Promise<void>
}

export const comfyKey = "COMFY_API_KEY"

export const tokenHolder = "<token>"

export function capArgs(
  options: DeployOptions,
  target: DeployTarget
): string[] {
  return target.kind === "judge" && options.cap !== null
    ? ["--var", `SPEND_CAP_CREDITS:${options.cap}`]
    : []
}

export function addressOf(
  session: WranglerSession,
  target: DeployTarget
): string {
  const address = session.addresses.get(target.kind)
  if (address === undefined) {
    throw new Error(`${target.worker} has no address yet.`)
  }
  return address
}

export function printOwnerLink(
  session: WranglerSession,
  tools: StepTools,
  token: string
): void {
  const address = session.addresses.get("judge")
  if (address === undefined) {
    throw new Error("The owner link has no address yet.")
  }
  tools.print(`\nThe owner link, printed once. Keep it now:`)
  tools.print(`${address}/#token=${token}\n`)
  session.ownerLink = "shown"
}

export function probesOf(
  options: DeployOptions,
  target: DeployTarget,
  token: string | undefined
): Probe[] {
  if (target.kind === "public") {
    return [
      { path: "/", status: 200 },
      { path: "/api/runs", status: 200 },
      { path: "/privacy", status: 200 },
    ]
  }
  if (token === undefined) {
    throw new Error("The owner link has no token to check.")
  }
  return [
    { path: "/", status: 200 },
    { path: "/api/runs", status: 401 },
    { path: "/api/runs", status: 200, token },
    {
      path: "/api/account",
      status: 200,
      token,
      ...(options.cap === null ? {} : { capCredits: options.cap }),
    },
  ]
}
