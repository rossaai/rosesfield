import { useEffect, useRef, useSyncExternalStore } from "react"

type AppToolsState = {
  openers: Set<() => void>
  keys: number
  listeners: Set<() => void>
}

const tools: AppToolsState = {
  openers: new Set(),
  keys: 0,
  listeners: new Set(),
}

function announceKeys(): void {
  for (const listener of tools.listeners) {
    listener()
  }
}

function subscribeKeys(listener: () => void): () => void {
  tools.listeners.add(listener)
  return () => {
    tools.listeners.delete(listener)
  }
}

function hasKey(): boolean {
  return tools.keys > 0
}

export function openAppTools(): boolean {
  const latest = [...tools.openers].at(-1)
  latest?.()
  return latest !== undefined
}

export function useAppToolsOpener(open: () => void): void {
  const latest = useRef(open)
  latest.current = open
  useEffect(() => {
    const opener = (): void => latest.current()
    tools.openers.add(opener)
    return () => {
      tools.openers.delete(opener)
    }
  }, [])
}

export function useAppToolsKey(): () => boolean {
  useEffect(() => {
    tools.keys += 1
    announceKeys()
    return () => {
      tools.keys -= 1
      announceKeys()
    }
  }, [])
  return openAppTools
}

export function useHasAppToolsKey(): boolean {
  return useSyncExternalStore(subscribeKeys, hasKey, () => false)
}
