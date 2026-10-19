import type { AppDefinition } from "@rosesfield/contract"

export abstract class AppCatalog {
  /** Returns the app with this id, or null when the catalog has none. */
  abstract find(appId: string): AppDefinition | null
}
