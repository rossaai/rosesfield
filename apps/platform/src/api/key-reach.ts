import { useQuery } from "@tanstack/react-query"
import type { KeyFrom } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"
import { useHasVisitorKey } from "@/api/visitor-keys"

export type KeyReach = "unknown" | "add" | "held" | "server"

export function keyReachOf(
  keyFrom: KeyFrom | undefined,
  hasKey: boolean
): KeyReach {
  if (keyFrom === undefined) {
    return "unknown"
  }
  if (keyFrom === "server") {
    return "server"
  }
  return hasKey ? "held" : "add"
}

export function useKeyReach(): KeyReach {
  const keyFrom = useQuery(settingsQuery).data?.keyFrom
  return keyReachOf(keyFrom, useHasVisitorKey("engine"))
}
