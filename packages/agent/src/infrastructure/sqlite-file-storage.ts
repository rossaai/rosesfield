import type { Storage } from "@earendil-works/pi-durable"
import { openNodeSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/node"

export function openSqliteFileStorage(file: string): Promise<Storage> {
  return openNodeSqliteStorage(file)
}
