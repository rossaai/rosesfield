import type { AppDefinition } from "@rosesfield/contract"
import { findApp } from "#list-apps"

export function audioDefinition(): AppDefinition {
  const app = findApp("audio")
  if (app === null) {
    throw new Error("The catalog lists no audio app. Run bun run catalog:sync")
  }
  return app
}
