import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { hasCatalogText } from "@/copy/t"

const source = join(import.meta.dirname, "../../src")
const key = String.raw`[a-z][\w-]*(?:\.[\w-]+)+`
const literalRead = new RegExp(
  String.raw`\btCatalog(Count)?\(\s*"(${key})"`,
  "g"
)
const keyConstant = new RegExp(
  String.raw`\bconst (\w+)(?::\s*[\w<>[\]]+)?\s*=\s*"(${key})"`,
  "g"
)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return sourceFiles(path)
    }
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".gen.ts")
      ? [path]
      : []
  })
}

function keysOf(text: string, count: boolean): string[] {
  return count ? [`${text}.one`, `${text}.other`] : [text]
}

function readKeys(texts: readonly string[]): string[] {
  const all = texts.join("\n")
  const read = texts.flatMap((text) =>
    [...text.matchAll(literalRead)].flatMap((match) =>
      keysOf(match[2] ?? "", match[1] !== undefined)
    )
  )
  const constants = texts.flatMap((text) =>
    [...text.matchAll(keyConstant)].flatMap((match) => {
      const name = match[1] ?? ""
      const counted = all.includes(`tCatalogCount(${name}`)
      return counted || all.includes(`tCatalog(${name}`)
        ? keysOf(match[2] ?? "", counted)
        : []
    })
  )
  return [...new Set([...read, ...constants])]
}

describe("the catalog keys the platform reads", () => {
  it("each have a row in a copy file", () => {
    const texts = sourceFiles(source).map((file) => readFileSync(file, "utf8"))
    const keys = readKeys(texts)
    expect(keys.length).toBeGreaterThan(50)
    expect(keys.filter((one) => !hasCatalogText(one))).toEqual([])
  })

  it("finds a key read through a constant and a counted key", () => {
    const texts = [
      'const labelKey = "nowhere.label"\ntCatalog(labelKey)',
      'tCatalogCount("nowhere.count", 2)',
      'const storageKey = "nowhere.store"',
    ]
    expect(readKeys(texts)).toEqual([
      "nowhere.count.one",
      "nowhere.count.other",
      "nowhere.label",
    ])
  })
})
