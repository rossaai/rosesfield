import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { renderCatalog, syncCatalog } from "../scripts/catalog-sync"

let source = ""

afterEach(() => {
  rmSync(source, { recursive: true, force: true })
})

function folder(name: string, files: string[]): void {
  mkdirSync(join(source, name), { recursive: true })
  for (const file of files) {
    writeFileSync(join(source, name, file), "")
  }
}

function sync() {
  return syncCatalog({ source, output: join(source, "apps.gen.ts") })
}

function fresh(): void {
  source = mkdtempSync(join(tmpdir(), "rosesfield-catalog-"))
  writeFileSync(join(source, "index.ts"), "")
}

describe("syncCatalog", () => {
  it("lists each folder with an app.ts and skips the template and folders without one", () => {
    fresh()
    folder("_template", ["app.ts", "copy.en.ts"])
    folder("image", ["copy.en.ts"])
    folder("video-edit", ["app.ts", "copy.en.ts"])
    folder("audio", ["app.ts", "copy.en.ts"])
    expect(sync()).toEqual({ listed: ["audio", "video-edit"], written: true })
    expect(readFileSync(join(source, "apps.gen.ts"), "utf8")).toBe(
      [
        'import type { AppEntry } from "#define-app"',
        'import { app as audio } from "#audio/app"',
        'import { app as videoEdit } from "#video-edit/app"',
        "",
        "export const apps: readonly AppEntry[] = [",
        '  { folder: "audio", app: audio },',
        '  { folder: "video-edit", app: videoEdit },',
        "]",
        "",
      ].join("\n")
    )
  })

  it("writes nothing when the catalog has not changed", () => {
    fresh()
    folder("audio", ["app.ts", "copy.en.ts"])
    sync()
    expect(sync().written).toBe(false)
  })

  it("writes an empty list when no folder holds an app.ts", () => {
    fresh()
    folder("image", ["copy.en.ts"])
    sync()
    expect(readFileSync(join(source, "apps.gen.ts"), "utf8")).toBe(
      renderCatalog([])
    )
    expect(renderCatalog([])).toContain(
      "export const apps: readonly AppEntry[] = []"
    )
  })

  it("lists a folder that holds only app.ts and copy.en.ts", () => {
    fresh()
    folder("voice", ["app.ts", "copy.en.ts"])
    expect(sync().listed).toEqual(["voice"])
  })

  it.each([
    { name: "Video_Edit", files: [], problem: "kebab-case" },
    { name: "voice", files: ["app.ts"], problem: "copy.en.ts" },
  ])("refuses the folder $name and names the problem", (row) => {
    fresh()
    folder(row.name, row.files)
    expect(() => sync()).toThrow(row.problem)
  })
})
