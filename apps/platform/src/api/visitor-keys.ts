import { useSyncExternalStore } from "react"
import { KeptValues } from "@/api/kept-values"
import { readOwnerToken } from "@/api/owner-token"

export type VisitorKeyKind = "engine"

export type VisitorKeyProblem = "required" | "invalid" | null

export const visitorKeyKinds: readonly VisitorKeyKind[] = ["engine"]

export const engineKeyHeader = "X-Engine-Key"

const headerNames: Readonly<Record<VisitorKeyKind, string>> = {
  engine: engineKeyHeader,
}

const keyPattern = /^[\x21-\x7e]{1,1024}$/
const kept = new KeptValues({ database: "rosesfield-visitor", store: "keys" })
const listeners = new Set<() => void>()
let current: Readonly<Record<VisitorKeyKind, string | null>> = {
  engine: null,
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

const goneKinds: readonly string[] = ["agent"]

export async function loadVisitorKeys(): Promise<void> {
  await Promise.all(goneKinds.map((kind) => kept.remove(kind)))
  current = { engine: await kept.read("engine") }
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

export function sendsCredentials(): boolean {
  return readOwnerToken() !== null || current.engine !== null
}

export function useHasVisitorKey(kind: VisitorKeyKind): boolean {
  return useSyncExternalStore(subscribe, () => current[kind] !== null)
}
