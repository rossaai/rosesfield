import type { Brand } from "#brand"
import { IdFormat } from "#id/id-format"

export type CharacterId = Brand<string, "CharacterId">

export const characterIdFormat: IdFormat<CharacterId> =
  new IdFormat<CharacterId>({
    name: "character id",
    pattern: IdFormat.uuidPattern,
  })
