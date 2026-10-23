import { listApps } from "@rosesfield/catalog"
import { type AppListing, appListing } from "@rosesfield/contract"

const everyApp: readonly AppListing[] = listApps().map((app) =>
  appListing.parse(app)
)

export const retiredApps: ReadonlySet<string> = new Set(["audio"])

export const catalogApps: readonly AppListing[] = everyApp.filter(
  (app) => !retiredApps.has(app.id)
)

export function findCatalogApp(appId: string): AppListing | null {
  return everyApp.find((app) => app.id === appId) ?? null
}
