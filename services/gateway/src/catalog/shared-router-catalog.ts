import { RouterCatalog } from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"

let shared: RouterCatalog | null = null

export function sharedRouterCatalog(clock: Clock): RouterCatalog {
  shared ??= new RouterCatalog({ clock })
  return shared
}
