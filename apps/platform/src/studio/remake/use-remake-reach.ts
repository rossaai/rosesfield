import { isRemakeOpen } from "@rosesfield/catalog/remake/reach"
import { useQuery } from "@tanstack/react-query"
import type { GatewaySettings } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"

export type RemakeReach = "unknown" | "open" | "closed"

export function remakeReachOf(
  settings: GatewaySettings | undefined
): RemakeReach {
  if (settings === undefined || settings.place === null) {
    return "unknown"
  }
  return isRemakeOpen({ mode: settings.mode, place: settings.place })
    ? "open"
    : "closed"
}

export function useRemakeReach(): RemakeReach {
  return remakeReachOf(useQuery(settingsQuery).data)
}
