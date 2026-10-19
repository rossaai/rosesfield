import type { AppDefinition } from "@rosesfield/contract"
import { AppCatalog } from "#domain/app-catalog.port"

export class FakeAppCatalog extends AppCatalog {
  private readonly apps: readonly AppDefinition[]

  constructor(apps: readonly AppDefinition[]) {
    super()
    this.apps = apps
  }

  override find(appId: string): AppDefinition | null {
    return this.apps.find((app) => app.id === appId) ?? null
  }
}
