import { useEffect, useRef, useSyncExternalStore } from "react"

type AppToolsState = {
  openers: Set<() => void>
  keys: number
  listeners: Set<() => void>
  loading: number
  held: (() => void) | null
}

const tools: AppToolsState = {
  openers: new Set(),
  keys: 0,
  listeners: new Set(),
  loading: 0,
  held: null,
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

export function requestAppTools(fallback: () => void): void {
  if (openAppTools()) {
    return
  }
  if (tools.loading > 0) {
    tools.held = fallback
    return
  }
  fallback()
}

export function useAppToolsScreen(): void {
  useEffect(
    () => () => {
      tools.held = null
    },
    []
  )
}

export function useAppToolsLoading(): void {
  useEffect(() => {
    tools.loading += 1
    return () => {
      tools.loading -= 1
    }
  }, [])
}

export function useAppToolsSettled(): void {
  useEffect(() => {
    const held = tools.held
    tools.held = null
    if (held !== null && !openAppTools()) {
      held()
    }
  }, [])
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

export function useAppToolsKey(): (fallback: () => void) => void {
  useEffect(() => {
    tools.keys += 1
    announceKeys()
    return () => {
      tools.keys -= 1
      announceKeys()
    }
  }, [])
  return requestAppTools
}

export function useHasAppToolsKey(): boolean {
  return useSyncExternalStore(subscribeKeys, hasKey, () => false)
}
