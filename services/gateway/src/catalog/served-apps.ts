import { listApps } from "@rosesfield/catalog"
import { withOfferedEffects } from "@rosesfield/catalog/effects"
import { closeRemake, isRemakeOpen } from "@rosesfield/catalog/remake"
import type { AppDefinition } from "@rosesfield/contract"
import { serverReach } from "#compose/settings"
import type { WorkerVars } from "#env"
import type { ServedPlace } from "#gateway.contract"

export function servedApps(
  vars: WorkerVars,
  place: ServedPlace,
  apps: readonly AppDefinition[] = listApps()
): readonly AppDefinition[] {
  const offered = withOfferedEffects(apps, serverReach(vars))
  return isRemakeOpen({ mode: vars.access.mode, place })
    ? offered
    : closeRemake(offered)
}
