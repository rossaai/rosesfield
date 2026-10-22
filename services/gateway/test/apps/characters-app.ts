import { readApps } from "@rosesfield/catalog"
import type { AppDefinition } from "@rosesfield/contract"
import { app } from "../../../../packages/catalog/src/characters/app"

export function charactersApp(): AppDefinition {
  const [listed] = readApps([{ folder: "characters", app }])
  if (listed === undefined) {
    throw new Error("The characters app did not parse")
  }
  return listed
}
