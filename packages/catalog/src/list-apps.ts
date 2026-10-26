import { type AppDefinition, appDefinition } from "@rosesfield/contract"
import { z } from "zod"
import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { appOrder } from "#app-order"
import { apps } from "#apps.gen"
import type { AppEntry } from "#define-app"

let listed: readonly AppDefinition[] | null = null

export function readApps(
  entries: readonly AppEntry[],
  order: readonly string[] = appOrder
): AppDefinition[] {
  const seen = new Set<string>()
  const read = entries.map((entry) => {
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
    if (!order.includes(app.id)) {
      throw new AppDefinitionInvalidError({
        folder: entry.folder,
        reason: "the app order leaves it out",
      })
    }
    seen.add(app.id)
    return app
  })
  const missing = order.find((id) => !seen.has(id))
  if (missing !== undefined) {
    throw new AppDefinitionInvalidError({
      folder: missing,
      reason: "the app order names it and no folder holds it",
    })
  }
  return read.toSorted((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
}

export function listApps(): readonly AppDefinition[] {
  listed ??= readApps(apps)
  return listed
}

export function findApp(appId: string): AppDefinition | null {
  return listApps().find((app) => app.id === appId) ?? null
}
