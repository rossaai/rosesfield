import type { Brand } from "#brand"
import { IdFormat } from "#id/id-format"

export type RunId = Brand<string, "RunId">

export const runIdFormat: IdFormat<RunId> = new IdFormat<RunId>({
  name: "run id",
  pattern: IdFormat.uuidPattern,
})
