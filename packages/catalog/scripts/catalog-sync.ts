import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { syncWorkflows } from "./workflows-sync"

export type AppFolder = {
  id: string
  hasDefinition: boolean
}

type SyncCatalogOptions = {
  source: string
  output: string
}

type SyncResult = {
  listed: string[]
  written: boolean
}

const appIdPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

export function readAppFolders(source: string): AppFolder[] {
  return readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter(
      (entry) => !entry.name.startsWith("_") && !entry.name.startsWith(".")
    )
    .map((entry) => ({
      id: entry.name,
      hasDefinition: existsSync(join(source, entry.name, "app.ts")),
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function findProblems(source: string, folder: AppFolder): string[] {
  const problems: string[] = []
  if (!appIdPattern.test(folder.id)) {
    problems.push(`${folder.id}: the folder name is not a kebab-case app id`)
  }
  if (
    folder.hasDefinition &&
    !existsSync(join(source, folder.id, "copy.en.ts"))
  ) {
    problems.push(`${folder.id}: app.ts has no copy.en.ts beside it`)
  }
  return problems
}

export function renderCatalog(folders: readonly AppFolder[]): string {
  const listed = folders.filter((folder) => folder.hasDefinition)
  const imports = listed.map(
    (folder) =>
      `import { app as ${identifierOf(folder.id)} } from "#${folder.id}/app"`
  )
  const entries = listed.map(
    (folder) => `  { folder: "${folder.id}", app: ${identifierOf(folder.id)} },`
  )
  return [
    'import type { AppEntry } from "#define-app"',
    ...imports,
    "",
    entries.length === 0
      ? "export const apps: readonly AppEntry[] = []"
      : ["export const apps: readonly AppEntry[] = [", ...entries, "]"].join(
          "\n"
        ),
    "",
  ].join("\n")
}

export function syncCatalog(options: SyncCatalogOptions): SyncResult {
  const folders = readAppFolders(options.source)
  const problems = folders.flatMap((folder) =>
    findProblems(options.source, folder)
  )
  if (problems.length > 0) {
    throw new Error(`The catalog has problems:\n${problems.join("\n")}`)
  }
  const next = renderCatalog(folders)
  const current = existsSync(options.output)
    ? readFileSync(options.output, "utf8")
    : null
  if (current !== next) {
    writeFileSync(options.output, next)
  }
  return {
    listed: folders
      .filter((folder) => folder.hasDefinition)
      .map((folder) => folder.id),
    written: current !== next,
  }
}

function identifierOf(id: string): string {
  return id.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
}

if (import.meta.main) {
  const source = fileURLToPath(new URL("../src", import.meta.url))
  try {
    const result = syncCatalog({ source, output: join(source, "apps.gen.ts") })
    console.log(
      `catalog: ${result.listed.length} apps listed in src/apps.gen.ts`
    )
    const workflows = syncWorkflows({
      source: fileURLToPath(new URL("../../../workflows", import.meta.url)),
      output: join(source, "workflows.gen.ts"),
      importBase: "../../../workflows",
    })
    console.log(
      `catalog: ${workflows.listed.length} workflows listed in src/workflows.gen.ts`
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
