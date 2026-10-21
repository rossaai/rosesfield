import { listApps } from "@rosesfield/catalog"
import { withOfferedEffects } from "@rosesfield/catalog/effects"
import { closeRemake } from "@rosesfield/catalog/remake"
import type { AppDefinition } from "@rosesfield/contract"
import { serverReach } from "#compose/settings"
import type { WorkerVars } from "#env"

export type ServedPlace = "bun" | "workers"

export function servedApps(
  vars: WorkerVars,
  place: ServedPlace,
  apps: readonly AppDefinition[] = listApps()
): readonly AppDefinition[] {
  const offered = withOfferedEffects(apps, serverReach(vars))
  return place === "bun" && vars.access.mode === "owner"
    ? offered
    : closeRemake(offered)
}
