import type { AppDefinition } from "@rosesfield/contract"
import { AppCatalog } from "@rosesfield/generation"

type ListedAppCatalogOptions = {
  apps: readonly AppDefinition[]
}

export class ListedAppCatalog extends AppCatalog {
  private readonly apps: readonly AppDefinition[]

  constructor(options: ListedAppCatalogOptions) {
    super()
    this.apps = options.apps
  }

  override find(appId: string): AppDefinition | null {
    return this.apps.find((app) => app.id === appId) ?? null
  }
}
