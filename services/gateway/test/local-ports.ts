import { join } from "node:path"
import {
  DemoGenerationEngine,
  DrizzleRunRepository,
  migrateRunTable,
} from "@rosesfield/generation"
import {
  DrizzleAssetRepository,
  DrizzleCharacterRepository,
  FilesystemAssetStore,
  migrateLibraryTables,
} from "@rosesfield/library"
import { drizzle } from "drizzle-orm/bun-sqlite"
import type { PortsFor } from "./harness"
import { audioApp, imageApp } from "./sample-apps"

export const localPorts: PortsFor = (clock, folder) => {
  const db = drizzle(":memory:")
  migrateRunTable(db)
  migrateLibraryTables(db)
  return {
    apps: [imageApp(), audioApp()],
    runs: new DrizzleRunRepository({ db }),
    assets: new DrizzleAssetRepository({ db }),
    characters: new DrizzleCharacterRepository({ db }),
    store: new FilesystemAssetStore({ root: join(folder, "assets") }),
    engines: [new DemoGenerationEngine({ clock })],
    clock,
  }
}
