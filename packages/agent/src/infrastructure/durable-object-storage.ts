import type { Storage } from "@earendil-works/pi-durable"
import {
  type DurableObjectSqliteStorage,
  openDurableObjectSqliteStorage,
} from "@earendil-works/pi-durable/storage/sqlite/cloudflare"

export type { DurableObjectSqliteStorage }

export function openDurableObjectStorage(
  storage: DurableObjectSqliteStorage
): Promise<Storage> {
  return openDurableObjectSqliteStorage(storage, { prefix: "pi_" })
}
