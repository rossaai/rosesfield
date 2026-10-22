import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Glob } from "bun"

const here = fileURLToPath(new URL(".", import.meta.url))
const root = fileURLToPath(new URL("../../../", import.meta.url))

const sources = ["packages/ui/src/**/*.tsx", "apps/platform/src/**/*.tsx"]

const refused = [
  /^transition(?:-.+)?$/,
  /^duration-/,
  /^ease-/,
  /^delay-/,
  /^\[(?:transition|animation-duration|animation-timing)/,
]

function baseOf(token: string): string {
  let depth = 0
  let start = 0
  for (let index = 0; index < token.length; index += 1) {
    const mark = token[index]
    if (mark === "[") {
      depth += 1
    } else if (mark === "]") {
      depth -= 1
    } else if (mark === ":" && depth === 0) {
      start = index + 1
    }
  }
  return token.slice(start).replace(/^!|!$/g, "")
}

export function refusalsOf(
  text: string
): ReadonlyArray<{ line: number; token: string }> {
  const found: { line: number; token: string }[] = []
  text.split("\n").forEach((line, index) => {
    for (const token of line.match(/[^\s"'`{}(),;<>=]+/g) ?? []) {
      const base = baseOf(token)
      if (refused.some((pattern) => pattern.test(base))) {
        found.push({ line: index + 1, token })
      }
    }
  })
  return found
}

async function controlHolds(): Promise<boolean> {
  const planted = await readFile(join(here, "planted-transitions.txt"), "utf8")
  const lines = planted.split("\n").filter((line) => line !== "")
  return lines.every((line) => {
    const caught = refusalsOf(line).length > 0
    return line.startsWith("refused") ? caught : !caught
  })
}

async function scannedFiles(): Promise<readonly string[]> {
  const files = new Set<string>()
  for (const pattern of sources) {
    for await (const path of new Glob(pattern).scan({ cwd: root })) {
      files.add(path)
    }
  }
  return [...files].sort()
}

const files = await scannedFiles()
let count = 0
for (const path of files) {
  for (const { line, token } of refusalsOf(
    await readFile(join(root, path), "utf8")
  )) {
    count += 1
    console.error(
      `${path}:${line}: ${token} sets its own transition. Name a motion preset from @rosesfield/ui/motion instead, such as motion.tint or motion.press, so every transition runs on a registry curve.`
    )
  }
}
const control = await controlHolds()
console.log(
  `${files.length} files checked, ${count} transitions refused. The planted fixture was ${control ? "refused line by line, and its allowed lines passed" : "not read as planted"}.`
)
process.exit(count === 0 && control ? 0 : 1)
