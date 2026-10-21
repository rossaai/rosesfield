import { listApps } from "@rosesfield/catalog"
import { withOfferedEffects } from "@rosesfield/catalog/effects"
import type { AppDefinition } from "@rosesfield/contract"
import { serverReach } from "#compose/settings"
import type { WorkerVars } from "#env"

export function servedApps(
  vars: WorkerVars,
  apps: readonly AppDefinition[] = listApps()
): readonly AppDefinition[] {
  return withOfferedEffects(apps, serverReach(vars))
}
