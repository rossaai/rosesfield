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

const hostCall =
  /\b(fetch|spawn|spawnSync|exec|execFile|execSync|request|axios)\s*\(|new\s+(Request|XMLHttpRequest|WebSocket)\b|\b(curl|wget)\s/

type DisplayOnly = { path: string; reason: string }

const displayOnly: readonly DisplayOnly[] = [
  {
    path: "apps/platform/src/gallery/screens/screen-fixtures.ts",
    reason:
      "a gallery fixture of the Settings screen: the engine address the screen shows as text, with no request",
  },
]

type Found = { calling: string[]; naming: string[] }

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

function comfyHostFiles(root: string): Found {
  const named = filesUnder(root)
    .filter((path) => scanned.some((pattern) => pattern.test(path)))
    .filter((path) => codeFile.test(path) && !adapters.test(path))
    .map((path) => ({ path, text: readFileSync(join(root, path), "utf8") }))
    .filter((file) => comfyHost.test(file.text))
  return {
    calling: named
      .filter((file) => hostCall.test(file.text))
      .map((file) => file.path)
      .sort(),
    naming: named
      .filter((file) => !hostCall.test(file.text))
      .map((file) => file.path)
      .sort(),
  }
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
  it("finds no code outside the adapters that names a Comfy API host and calls a host", () => {
    expect(comfyHostFiles(repositoryRoot).calling).toEqual([])
  })

  it("lets a file name a Comfy API host only as a display-only row with its reason", () => {
    const allowed = displayOnly.map((row) => row.path).sort()
    expect(comfyHostFiles(repositoryRoot).naming).toEqual(allowed)
    for (const row of displayOnly) {
      expect(row.reason.length).toBeGreaterThan(20)
    }
  })

  it("catches a planted script and a planted screen that call a Comfy API host, and passes an adapter and a display-only file", () => {
    plant(
      "scripts/probe/run-model.ts",
      'await fetch("https://api.comfy.org/v2/models/maker/model")'
    )
    plant(
      "apps/platform/src/screens/run.tsx",
      'const base = "https://cloud.comfy.org"\nawait fetch(base + "/api/v2/jobs")'
    )
    plant(
      "scripts/probe/curl.sh",
      "curl https://api.comfy.org/customers/balance"
    )
    plant(
      "apps/platform/src/gallery/address.ts",
      'export const address = "https://cloud.comfy.org"'
    )
    plant(
      "packages/generation/src/infrastructure/engine.ts",
      'await fetch("https://api.comfy.org")'
    )
    plant(
      "packages/generation/test/recording.ts",
      'await fetch("https://api.comfy.org")'
    )
    expect(comfyHostFiles(planted)).toEqual({
      calling: [
        "apps/platform/src/screens/run.tsx",
        "scripts/probe/curl.sh",
        "scripts/probe/run-model.ts",
      ],
      naming: ["apps/platform/src/gallery/address.ts"],
    })
  })
})
