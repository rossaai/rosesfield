import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const testRoot = import.meta.dirname
const libraryImport = /import\s*\{([^}]*)\}\s*from\s*"@testing-library\/react"/g

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return listFiles(path)
    }
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

function isRendering(text: string): boolean {
  return [...text.matchAll(libraryImport)].some((match) =>
    /\b(render|renderHook)\b/.test(match[1] ?? "")
  )
}

const parenStep: Readonly<Record<string, number>> = { "(": 1, ")": -1 }

function closingParen(text: string, open: number): number {
  let depth = 0
  for (let at = open; at < text.length; at += 1) {
    depth += parenStep[text.charAt(at)] ?? 0
    if (depth === 0) {
      return at
    }
  }
  return text.length
}

function hasCleanupAfterEach(text: string): boolean {
  const opens = [...text.matchAll(/\bafterEach\(/g)].map(
    (match) => match.index + "afterEach".length
  )
  return opens.some((open) =>
    /\bcleanup\b/.test(text.slice(open, closingParen(text, open)))
  )
}

function findUncleaned(files: ReadonlyMap<string, string>): string[] {
  return [...files].flatMap(([file, text]) =>
    /\.test\.tsx?$/.test(file) &&
    isRendering(text) &&
    !hasCleanupAfterEach(text)
      ? [file]
      : []
  )
}

describe("the platform's DOM tests", () => {
  it("unmount what each test file renders through Testing Library, with cleanup after each test", () => {
    const files = new Map(
      listFiles(testRoot)
        .filter((file) => file !== import.meta.filename)
        .map((file) => [file, readFileSync(file, "utf8")])
    )
    const testFiles = [...files.keys()].filter((file) =>
      /\.test\.tsx?$/.test(file)
    )
    expect(testFiles.length).toBeGreaterThan(200)
    expect(findUncleaned(files)).toEqual([])
  })

  it("names a test file that renders a hook and leaves it mounted after its tests, the control", () => {
    const files = new Map([
      [
        "/t/kept.test.tsx",
        'import { renderHook } from "@testing-library/react"\nafterEach(() => {\n  globalThis.fetch = realFetch\n})\nit("a", () => { renderHook(() => 1) })\nit("b", () => { cleanup() })',
      ],
      [
        "/t/cleaned.test.tsx",
        'import { cleanup, renderHook } from "@testing-library/react"\nafterEach(() => {\n  cleanup()\n  globalThis.fetch = realFetch\n})',
      ],
      [
        "/t/short.test.tsx",
        'import { cleanup, render } from "@testing-library/react"\nafterEach(cleanup)',
      ],
      [
        "/t/screen-helper.tsx",
        'import { render } from "@testing-library/react"\nexport function show() { render(null) }',
      ],
      [
        "/t/no-render.test.ts",
        'import { screen } from "@testing-library/react"',
      ],
    ])
    expect(findUncleaned(files)).toEqual(["/t/kept.test.tsx"])
  })
})
