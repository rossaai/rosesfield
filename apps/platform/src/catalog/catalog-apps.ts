import { listApps } from "@rosesfield/catalog"
import { type AppListing, appListing } from "@rosesfield/contract"

export const catalogApps: readonly AppListing[] = listApps().map((app) =>
  appListing.parse(app)
)

export function findCatalogApp(appId: string): AppListing | null {
  return catalogApps.find((app) => app.id === appId) ?? null
}
