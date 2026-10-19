import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { apps } from "#apps.gen"
import { defineApp } from "#define-app"
import { findApp, listApps, readApps } from "#list-apps"
import { readAppFolders, renderCatalog } from "../scripts/catalog-sync"
import { sampleApp } from "./sample-app"

const source = fileURLToPath(new URL("../src", import.meta.url))

describe("readApps", () => {
  it("parses each app and fills the defaults of its definition", () => {
    const [app] = readApps([{ folder: "sample", app: defineApp(sampleApp()) }])
    expect(app?.id).toBe("sample")
    expect(app?.preview).toBeNull()
  })

  it("refuses an app whose id is not its folder name", () => {
    expect(() =>
      readApps([{ folder: "image", app: sampleApp("picture") }])
    ).toThrow(expect.objectContaining({ code: "APP_DEFINITION_INVALID" }))
  })

  it("refuses an app listed twice", () => {
    const entry = { folder: "sample", app: sampleApp() }
    expect(() => readApps([entry, entry])).toThrow(
      expect.objectContaining({ code: "APP_DEFINITION_INVALID" })
    )
  })

  it("refuses an app that breaks the definition and names the field", () => {
    const app = { ...sampleApp(), limits: { timeoutSeconds: 0, maxRetries: 2 } }
    expect(() => readApps([{ folder: "sample", app }])).toThrow(/limits/)
  })
})

describe("listApps", () => {
  it("lists every app the generated catalog holds, each one valid", () => {
    expect(listApps().map((app) => app.id)).toEqual(
      readApps(apps).map((app) => app.id)
    )
    for (const app of listApps()) {
      expect(findApp(app.id)).toBe(app)
    }
    expect(findApp("no-such-app")).toBeNull()
  })

  it("matches the app folders, so no app needs a shared file edited", () => {
    const generated = readFileSync(`${source}/apps.gen.ts`, "utf8")
    expect(generated).toBe(renderCatalog(readAppFolders(source)))
  })
})
