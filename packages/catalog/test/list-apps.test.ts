import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { appOrder } from "#app-order"
import { apps } from "#apps.gen"
import { defineApp } from "#define-app"
import { findApp, listApps, readApps } from "#list-apps"
import { readAppFolders, renderCatalog } from "../scripts/catalog-sync"
import { sampleApp } from "./sample-app"

const source = fileURLToPath(new URL("../src", import.meta.url))

describe("readApps", () => {
  it("parses each app and fills the defaults of its definition", () => {
    const [app] = readApps(
      [{ folder: "sample", app: defineApp(sampleApp()) }],
      ["sample"]
    )
    expect(app?.id).toBe("sample")
    expect(app?.preview).toBeNull()
  })

  it("refuses an app whose id is not its folder name", () => {
    expect(() =>
      readApps([{ folder: "image", app: sampleApp("picture") }], ["image"])
    ).toThrow(expect.objectContaining({ code: "APP_DEFINITION_INVALID" }))
  })

  it("refuses an app listed twice", () => {
    const entry = { folder: "sample", app: sampleApp() }
    expect(() => readApps([entry, entry], ["sample"])).toThrow(
      expect.objectContaining({ code: "APP_DEFINITION_INVALID" })
    )
  })

  it("returns the apps in the order it is given, not in folder order", () => {
    const read = readApps(
      [
        { folder: "alpha", app: sampleApp("alpha") },
        { folder: "beta", app: sampleApp("beta") },
      ],
      ["beta", "alpha"]
    )
    expect(read.map((app) => app.id)).toEqual(["beta", "alpha"])
  })

  it("refuses an app the order leaves out and names its folder", () => {
    expect(() =>
      readApps([{ folder: "sample", app: sampleApp() }], ["other"])
    ).toThrow(/sample is invalid: the app order leaves it out/)
  })

  it("refuses an order that names an app no folder holds", () => {
    expect(() =>
      readApps([{ folder: "sample", app: sampleApp() }], ["sample", "ghost"])
    ).toThrow(/ghost is invalid: the app order names it/)
  })

  it("refuses an app that breaks the definition and names the field", () => {
    const app = { ...sampleApp(), limits: { timeoutSeconds: 0, maxRetries: 2 } }
    expect(() => readApps([{ folder: "sample", app }], ["sample"])).toThrow(
      /limits/
    )
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

  it("lists the apps in the catalog's order, Image, Edit and Upscale first", () => {
    const ids = listApps().map((app) => app.id)
    expect(ids).toEqual([...appOrder])
    expect(ids.slice(0, 3)).toEqual(["image", "edit", "upscale"])
    expect(ids.indexOf("video")).toBeLessThan(ids.indexOf("effects"))
  })

  it("matches the app folders, so no app needs a shared file edited", () => {
    const generated = readFileSync(`${source}/apps.gen.ts`, "utf8")
    expect(generated).toBe(renderCatalog(readAppFolders(source)))
  })
})
