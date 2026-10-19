import { useSyncExternalStore } from "react"
import { KeptValues } from "@/api/kept-values"

export type VisitorKeyKind = "engine" | "agent"

export type VisitorKeyProblem = "required" | "invalid" | null

export const visitorKeyKinds: readonly VisitorKeyKind[] = ["engine", "agent"]

export const engineKeyHeader = "X-Engine-Key"

const headerNames: Readonly<Record<VisitorKeyKind, string>> = {
  engine: engineKeyHeader,
  agent: "X-Agent-Key",
}

const keyPattern = /^[\x21-\x7e]{1,1024}$/
const kept = new KeptValues({ database: "rosesfield-visitor", store: "keys" })
const listeners = new Set<() => void>()
let current: Readonly<Record<VisitorKeyKind, string | null>> = {
  engine: null,
  agent: null,
}

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function problemOfKey(value: string): VisitorKeyProblem {
  const key = value.trim()
  if (key === "") {
    return "required"
  }
  return keyPattern.test(key) ? null : "invalid"
}

export function readVisitorKey(kind: VisitorKeyKind): string | null {
  return current[kind]
}

export function visitorKeyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const kind of visitorKeyKinds) {
    const key = current[kind]
    if (key !== null) {
      headers[headerNames[kind]] = key
    }
  }
  return headers
}

export async function loadVisitorKeys(): Promise<void> {
  const [engine, agent] = await Promise.all([
    kept.read("engine"),
    kept.read("agent"),
  ])
  current = { engine, agent }
  emit()
}

export function holdVisitorKey(kind: VisitorKeyKind, key: string | null): void {
  current = { ...current, [kind]: key }
  emit()
}

export async function keepVisitorKey(
  kind: VisitorKeyKind,
  value: string
): Promise<void> {
  const key = value.trim()
  holdVisitorKey(kind, key)
  await kept.write(kind, key)
}

export async function forgetVisitorKey(kind: VisitorKeyKind): Promise<void> {
  holdVisitorKey(kind, null)
  await kept.remove(kind)
}

export function useHasVisitorKey(kind: VisitorKeyKind): boolean {
  return useSyncExternalStore(subscribe, () => current[kind] !== null)
}
