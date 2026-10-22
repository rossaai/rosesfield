import { RouterCatalog } from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"

export type RuntimeDefer = (work: Promise<void>) => void

export type CatalogKeep = {
  db: SqliteDatabase
  defer?: RuntimeDefer
}

type Kept = {
  catalog: RouterCatalog
  defer: RuntimeDefer | null
}

let unkept: RouterCatalog | null = null

const kept = new WeakMap<SqliteDatabase, Kept>()

function keptOn(clock: Clock, db: SqliteDatabase): Kept {
  const held = kept.get(db)
  if (held !== undefined) {
    return held
  }
  const made: Kept = {
    defer: null,
    catalog: new RouterCatalog({
      clock,
      db,
      defer: (work) => {
        made.defer?.(work)
      },
    }),
  }
  kept.set(db, made)
  return made
}

export function sharedRouterCatalog(
  clock: Clock,
  keep?: CatalogKeep
): RouterCatalog {
  if (keep === undefined) {
    unkept ??= new RouterCatalog({ clock })
    return unkept
  }
  const held = keptOn(clock, keep.db)
  held.defer ??= keep.defer ?? null
  return held.catalog
}
