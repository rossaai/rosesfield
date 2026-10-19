import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { vi } from "vitest"
import type { Seen } from "./visitor"

export type Logs = {
  lines: string[]
  restore: () => void
}

type LogMethod = "log" | "info" | "warn" | "error" | "debug"

const methods: readonly LogMethod[] = ["log", "info", "warn", "error", "debug"]

export function captureLogs(): Logs {
  const lines: string[] = []
  const spies = methods.map((method) =>
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      lines.push(
        args
          .map((arg) =>
            arg instanceof Error
              ? `${arg.name} ${arg.message} ${String(arg.stack)} ${JSON.stringify(arg.cause ?? null)}`
              : typeof arg === "string"
                ? arg
                : JSON.stringify(arg)
          )
          .join(" ")
      )
    })
  )
  return {
    lines,
    restore: () => {
      for (const spy of spies) {
        spy.mockRestore()
      }
    },
  }
}

export function filesHolding(folder: string, secret: string): string[] {
  const holding: string[] = []
  for (const name of readdirSync(folder)) {
    const path = join(folder, name)
    if (statSync(path).isDirectory()) {
      holding.push(...filesHolding(path, secret))
    } else if (readFileSync(path).includes(Buffer.from(secret))) {
      holding.push(path)
    }
  }
  return holding
}

export function seenHolding(seen: readonly Seen[], secret: string): Seen[] {
  return seen.filter(
    (one) => one.body.includes(secret) || one.headers.includes(secret)
  )
}
