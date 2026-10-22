import type { AppDefinition } from "@rosesfield/contract"

export const remakeAppId = "remake"

export const remakeClosedKey = "remake.closed"

export type RemakeReach = {
  mode: "owner" | "public"
  place: "bun" | "workers"
}

export function isRemakeOpen(reach: RemakeReach): boolean {
  return reach.mode === "owner" && reach.place === "bun"
}

export function closeRemake(
  apps: readonly AppDefinition[]
): readonly AppDefinition[] {
  if (!apps.some((app) => app.id === remakeAppId)) {
    return apps
  }
  return apps.map((app) =>
    app.id === remakeAppId ? { ...app, closedKey: remakeClosedKey } : app
  )
}
