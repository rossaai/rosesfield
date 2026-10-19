import { type AppDefinition, appDefinition } from "@rosesfield/contract"
import { z } from "zod"
import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { apps } from "#apps.gen"
import type { AppEntry } from "#define-app"

let listed: readonly AppDefinition[] | null = null

export function readApps(entries: readonly AppEntry[]): AppDefinition[] {
  const seen = new Set<string>()
  return entries.map((entry) => {
    const result = appDefinition.safeParse(entry.app)
    if (!result.success) {
      throw new AppDefinitionInvalidError({
        folder: entry.folder,
        reason: z.prettifyError(result.error),
      })
    }
    const app = result.data
    if (app.id !== entry.folder) {
      throw new AppDefinitionInvalidError({
        folder: entry.folder,
        reason: `its id is ${app.id}, and an app's id is its folder name`,
      })
    }
    if (seen.has(app.id)) {
      throw new AppDefinitionInvalidError({
        folder: entry.folder,
        reason: "another folder lists the same app",
      })
    }
    seen.add(app.id)
    return app
  })
}

export function listApps(): readonly AppDefinition[] {
  listed ??= readApps(apps)
  return listed
}

export function findApp(appId: string): AppDefinition | null {
  return listApps().find((app) => app.id === appId) ?? null
}
