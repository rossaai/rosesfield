import type { SidebarWidth } from "@rosesfield/ui/components/sidebar"
import { useCallback, useState } from "react"

function readWidth(key: string): SidebarWidth {
  try {
    return window.localStorage.getItem(key) === "rail" ? "rail" : "full"
  } catch {
    return "full"
  }
}

function writeWidth(key: string, width: SidebarWidth): void {
  try {
    window.localStorage.setItem(key, width)
  } catch {
    return
  }
}

export function useStoredWidth(
  key: string
): [SidebarWidth, (width: SidebarWidth) => void] {
  const [width, setWidth] = useState<SidebarWidth>(() => readWidth(key))
  const update = useCallback(
    (next: SidebarWidth) => {
      setWidth(next)
      writeWidth(key, next)
    },
    [key]
  )
  return [width, update]
}
