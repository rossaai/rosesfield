import { readFile } from "node:fs/promises"
import { posix } from "node:path"
import { fileURLToPath } from "node:url"
import { Glob } from "bun"

const root = fileURLToPath(new URL("../../../", import.meta.url))
const planted = "scripts/checks/doc-links/planted"
const modelTable = "## The workflows by model"

export type DeadLink = { readonly line: number; readonly target: string }
export type MissingGraph = { readonly line: number; readonly name: string }

function withoutCode(text: string): string[] {
  let fenced = false
  return text.split("\n").map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced
      return ""
    }
    return fenced ? "" : line.replace(/`[^`]*`/g, "")
  })
}

function pathOf(target: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) {
    return null
  }
  if (target.startsWith("/") || target.startsWith("<")) {
    return null
  }
  const path = target.replace(/[#?].*$/, "")
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

function resolves(path: string, files: ReadonlySet<string>): boolean {
  const target = posix.normalize(path).replace(/\/$/, "")
  if (target === "." || target === "") {
    return true
  }
  if (target.startsWith("..")) {
    return false
  }
  if (files.has(target)) {
    return true
  }
  const folder = `${target}/`
  for (const file of files) {
    if (file.startsWith(folder)) {
      return true
    }
  }
  return false
}

export function deadLinksOf(
  text: string,
  from: string,
  files: ReadonlySet<string>
): readonly DeadLink[] {
  const found: DeadLink[] = []
  withoutCode(text).forEach((line, index) => {
    for (const match of line.matchAll(
      /\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g
    )) {
      const target = match[1] ?? ""
      const path = pathOf(target)
      if (
        path !== null &&
        !resolves(posix.join(posix.dirname(from), path), files)
      ) {
        found.push({ line: index + 1, target })
      }
    }
  })
  return found
}

export function foldersUnder(
  folder: string,
  files: ReadonlySet<string>
): ReadonlySet<string> {
  const prefix = `${folder}/`
  const folders = new Set<string>()
  for (const file of files) {
    if (file.startsWith(prefix)) {
      const [name, ...rest] = file.slice(prefix.length).split("/")
      if (name !== undefined && rest.length > 0) {
        folders.add(name)
      }
    }
  }
  return folders
}

export function missingGraphsOf(
  readme: string,
  folders: ReadonlySet<string>
): readonly MissingGraph[] | null {
  const lines = readme.split("\n")
  const start = lines.findIndex((line) => line.trim() === modelTable)
  if (start === -1) {
    return null
  }
  const found: MissingGraph[] = []
  let rows = 0
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? ""
    if (line.startsWith("#")) {
      break
    }
    if (!line.startsWith("|")) {
      if (rows > 0) {
        break
      }
      continue
    }
    rows += 1
    const cells = line.split("|").slice(2)
    for (const match of cells.join("|").matchAll(/`([^`]+)`/g)) {
      const name = match[1] ?? ""
      if (!folders.has(name)) {
        found.push({ line: index + 1, name })
      }
    }
  }
  return rows > 2 ? found : null
}

type Report = {
  readonly files: number
  readonly dead: ReadonlyArray<DeadLink & { readonly path: string }>
  readonly missing: readonly MissingGraph[] | null
}

async function reportOf(
  base: string,
  docs: readonly string[],
  files: ReadonlySet<string>
): Promise<Report> {
  const dead: Array<DeadLink & { path: string }> = []
  for (const path of docs) {
    const text = await readFile(posix.join(base, path), "utf8")
    for (const link of deadLinksOf(text, path, files)) {
      dead.push({ path, ...link })
    }
  }
  const readme = posix.join("workflows", "README.md")
  const missing = files.has(readme)
    ? missingGraphsOf(
        await readFile(posix.join(base, readme), "utf8"),
        foldersUnder("workflows", files)
      )
    : null
  return { files: docs.length, dead, missing }
}

function listed(args: readonly string[]): string[] {
  const done = Bun.spawnSync(["git", "ls-files", "-z", ...args], {
    cwd: root,
  })
  if (done.exitCode !== 0) {
    throw new Error(`git ls-files failed: ${done.stderr.toString()}`)
  }
  return done.stdout
    .toString()
    .split("\0")
    .filter((path) => path !== "")
}

async function controlHolds(): Promise<boolean> {
  const base = posix.join(root, planted)
  const files = new Set<string>()
  for await (const path of new Glob("**/*").scan({ cwd: base })) {
    files.add(path)
  }
  const docs = [...files].filter((path) => path.endsWith(".md")).sort()
  const { dead, missing } = await reportOf(base, docs, files)
  return (
    dead.length === 1 &&
    dead[0]?.path === "guide.md" &&
    dead[0]?.target === "workflows/gone-graph/README.md" &&
    missing?.length === 1 &&
    missing[0]?.name === "missing-graph"
  )
}

const files = new Set(listed(["--cached", "--others", "--exclude-standard"]))
const docs = listed(["--cached", "*.md"]).filter(
  (path) => !path.startsWith(`${planted}/`) && files.has(path)
)
const { files: count, dead, missing } = await reportOf(root, docs, files)
for (const { path, line, target } of dead) {
  console.error(
    `${path}:${line}: the link ${target} names no file or folder in the tree. Point it at a path that ships, or remove it.`
  )
}
if (missing === null) {
  console.error(
    `workflows/README.md: no table under "${modelTable}" was found, so its graph names were not read.`
  )
}
for (const { line, name } of missing ?? []) {
  console.error(
    `workflows/README.md:${line}: ${name} names no folder under workflows/. Name a graph that ships, or remove it from the table.`
  )
}
const control = await controlHolds()
const refused = dead.length + (missing?.length ?? 1)
console.log(
  `${count} docs checked, ${dead.length} dead links and ${missing?.length ?? 0} missing graph names refused. The planted dead link and missing graph name were ${control ? "both caught, and the live link and graph beside them passed" : "not caught as planted"}.`
)
process.exit(refused === 0 && control ? 0 : 1)
