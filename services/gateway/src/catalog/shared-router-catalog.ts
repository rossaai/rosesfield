import { RouterCatalog } from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"

export type CatalogKeep = {
  db: SqliteDatabase
  defer: (work: Promise<void>) => void
}

let shared: RouterCatalog | null = null

export function sharedRouterCatalog(
  clock: Clock,
  keep?: CatalogKeep
): RouterCatalog {
  shared ??= new RouterCatalog(
    keep === undefined ? { clock } : { clock, ...keep }
  )
  return shared
}
