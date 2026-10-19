import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, it } from "vitest"

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..")

const scanned = [
  /^apps\/[^/]+\/src\//,
  /^packages\/[^/]+\/src\//,
  /^services\/[^/]+\/src\//,
  /^scripts\//,
]

const adapters = /^packages\/generation\/src\/infrastructure\//

const codeFile = /\.(ts|tsx|js|mjs|cjs|py|sh)$/

const comfyHost = /\b(api|cloud)\.comfy\.org\b/

const skipped = new Set([
  "node_modules",
  "dist",
  ".wrangler",
  ".git",
  ".claude",
])

function filesUnder(root: string, folder = root): string[] {
  return readdirSync(folder).flatMap((name) => {
    if (skipped.has(name)) {
      return []
    }
    const path = join(folder, name)
    return statSync(path).isDirectory()
      ? filesUnder(root, path)
      : [relative(root, path)]
  })
}

function filesNamingComfyHosts(root: string): string[] {
  return filesUnder(root)
    .filter((path) => scanned.some((pattern) => pattern.test(path)))
    .filter((path) => codeFile.test(path) && !adapters.test(path))
    .filter((path) => comfyHost.test(readFileSync(join(root, path), "utf8")))
    .sort()
}

const planted = mkdtempSync(join(tmpdir(), "rosesfield-hosts-"))

afterAll(() => {
  rmSync(planted, { recursive: true, force: true })
})

function plant(path: string, text: string): void {
  mkdirSync(dirname(join(planted, path)), { recursive: true })
  writeFileSync(join(planted, path), text)
}

describe("no paid Comfy route outside the engine adapters", () => {
  it("finds no file outside the adapters that names a Comfy API host", () => {
    expect(filesNamingComfyHosts(repositoryRoot)).toEqual([])
  })

  it("catches a planted script and a planted screen that name a Comfy API host, and passes an adapter", () => {
    plant(
      "scripts/probe/run-model.ts",
      'await fetch("https://api.comfy.org/v2/models/maker/model")'
    )
    plant(
      "apps/platform/src/screens/run.tsx",
      'const base = "https://cloud.comfy.org"'
    )
    plant(
      "packages/generation/src/infrastructure/engine.ts",
      'const url = "https://api.comfy.org"'
    )
    plant(
      "packages/generation/test/recording.ts",
      'const url = "https://api.comfy.org"'
    )
    expect(filesNamingComfyHosts(planted)).toEqual([
      "apps/platform/src/screens/run.tsx",
      "scripts/probe/run-model.ts",
    ])
  })
})
