import type { Brand } from "#brand"
import { IdFormat } from "#id/id-format"

export type AppId = Brand<string, "AppId">

export const appIdFormat: IdFormat<AppId> = new IdFormat<AppId>({
  name: "app id",
  pattern: IdFormat.kebabCasePattern,
})
