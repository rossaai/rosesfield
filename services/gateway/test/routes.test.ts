import { join } from "node:path"
import { DemoGenerationEngine, migrateRunTable } from "@rosesfield/generation"
import { FilesystemAssetStore, migrateLibraryTables } from "@rosesfield/library"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { describe } from "vitest"
import { SqliteAssetRepository } from "#infrastructure/sqlite-asset-repository"
import { SqliteCharacterRepository } from "#infrastructure/sqlite-character-repository"
import { SqliteRunRepository } from "#infrastructure/sqlite-run-repository"
import { migrateSessionTables } from "#session/bun-sqlite-session-migration"
import { SessionScope } from "#session/session-scope"
import type { PortsFor } from "./harness"
import { localPorts } from "./local-ports"
import { describeRoutes } from "./route-suite"
import { audioApp, imageApp } from "./sample-apps"

const sessionPorts: PortsFor = (clock, folder) => {
  const db = drizzle(":memory:")
  migrateRunTable(db)
  migrateLibraryTables(db)
  migrateSessionTables(db)
  const scope = new SessionScope({ db, sessionId: crypto.randomUUID() })
  return {
    apps: [imageApp(), audioApp()],
    runs: new SqliteRunRepository({ db, scope }),
    assets: new SqliteAssetRepository({ db, scope }),
    characters: new SqliteCharacterRepository({ db, scope }),
    store: new FilesystemAssetStore({ root: join(folder, "assets") }),
    engines: [new DemoGenerationEngine({ clock })],
    clock,
  }
}

describe("the bun runtime", () => {
  describeRoutes("bun:sqlite and the filesystem store", localPorts)
  describeRoutes("one session's records in bun:sqlite", sessionPorts)
})
