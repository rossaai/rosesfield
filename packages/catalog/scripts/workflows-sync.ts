import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export type WorkflowFolder = {
  id: string
}

type SyncWorkflowsOptions = {
  source: string
  output: string
  importBase: string
}

type SyncResult = {
  listed: string[]
  written: boolean
}

const workflowIdPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function readWorkflowFolders(source: string): WorkflowFolder[] {
  if (!existsSync(source)) {
    return []
  }
  return readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter(
      (entry) => !entry.name.startsWith("_") && !entry.name.startsWith(".")
    )
    .map((entry) => ({ id: entry.name }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function findWorkflowProblems(
  source: string,
  folder: WorkflowFolder
): string[] {
  const { id } = folder
  if (!workflowIdPattern.test(id)) {
    return [`${id}: the folder name is not a kebab-case workflow id`]
  }
  const needed = ["entry.json", `${id}.json`, `${id}.api.json`]
  return needed
    .filter((file) => !existsSync(join(source, id, file)))
    .map((file) => `${id}: ${file} is missing`)
}

function identifierOf(id: string): string {
  return `w${id.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase()).replace(/^./, (letter) => letter.toUpperCase())}`
}

export function renderWorkflows(
  folders: readonly WorkflowFolder[],
  importBase: string
): string {
  const imports = folders.flatMap((folder) => {
    const name = identifierOf(folder.id)
    const base = `${importBase}/${folder.id}`
    return [
      `import ${name}Api from "${base}/${folder.id}.api.json"`,
      `import ${name}Entry from "${base}/entry.json"`,
    ]
  })
  const entries = folders.map((folder) => {
    const name = identifierOf(folder.id)
    return `  { folder: "${folder.id}", entry: ${name}Entry, graph: ${name}Api },`
  })
  return [
    'import type { WorkflowFiles } from "#workflow-entry.contract"',
    ...imports,
    "",
    entries.length === 0
      ? "export const workflowFiles: readonly WorkflowFiles[] = []"
      : [
          "export const workflowFiles: readonly WorkflowFiles[] = [",
          ...entries,
          "]",
        ].join("\n"),
    "",
  ].join("\n")
}

export function syncWorkflows(options: SyncWorkflowsOptions): SyncResult {
  const folders = readWorkflowFolders(options.source)
  const problems = folders.flatMap((folder) =>
    findWorkflowProblems(options.source, folder)
  )
  if (problems.length > 0) {
    throw new Error(`The workflows have problems:\n${problems.join("\n")}`)
  }
  const next = renderWorkflows(folders, options.importBase)
  const current = existsSync(options.output)
    ? readFileSync(options.output, "utf8")
    : null
  if (current !== next) {
    writeFileSync(options.output, next)
  }
  return {
    listed: folders.map((folder) => folder.id),
    written: current !== next,
  }
}
