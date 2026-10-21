import type { AppDefinition } from "@rosesfield/contract"
import { audioApp } from "#audio/audio-app"
import { readApps } from "#list-apps"

export function audioDefinition(): AppDefinition {
  const [parsed] = readApps([{ folder: "audio", app: audioApp }])
  if (parsed === undefined) {
    throw new Error("The audio app did not parse")
  }
  return parsed
}
