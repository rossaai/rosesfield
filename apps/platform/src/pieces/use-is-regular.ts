import { useSyncExternalStore } from "react"

function regularQuery(): MediaQueryList | null {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return null
  }
  const width = getComputedStyle(document.documentElement)
    .getPropertyValue("--container-regular")
    .trim()
  return width === "" ? null : window.matchMedia(`(min-width: ${width})`)
}

function subscribe(onChange: () => void): () => void {
  const query = regularQuery()
  query?.addEventListener("change", onChange)
  return () => query?.removeEventListener("change", onChange)
}

function isRegular(): boolean {
  return regularQuery()?.matches ?? true
}

export function useIsRegularWindow(): boolean {
  return useSyncExternalStore(subscribe, isRegular, () => true)
}
