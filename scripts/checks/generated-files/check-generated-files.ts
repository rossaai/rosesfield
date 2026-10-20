import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

type Row = { path: string; sha256: string }

const root = fileURLToPath(new URL("../../../", import.meta.url))

function rowOf(file: unknown): Row {
  if (
    typeof file === "object" &&
    file !== null &&
    "path" in file &&
    typeof file.path === "string" &&
    "sha256" in file &&
    typeof file.sha256 === "string"
  ) {
    return { path: file.path, sha256: file.sha256 }
  }
  throw new Error("generated.json holds a row with no path or sha256")
}

function rowsOf(text: string): readonly Row[] {
  const parsed: unknown = JSON.parse(text)
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("files" in parsed) ||
    !Array.isArray(parsed.files)
  ) {
    throw new Error("generated.json holds no files list")
  }
  return parsed.files.map(rowOf)
}

async function shaOf(file: string): Promise<string | null> {
  try {
    return createHash("sha256")
      .update(await readFile(file))
      .digest("hex")
  } catch {
    return null
  }
}

export async function refusals(
  base: string,
  rows: readonly Row[]
): Promise<readonly string[]> {
  const found: string[] = []
  for (const row of rows) {
    const sha = await shaOf(join(base, row.path))
    if (sha === null) {
      found.push(`${row.path}: listed in generated.json and missing`)
    } else if (sha !== row.sha256) {
      found.push(`${row.path}: its bytes differ from generated.json`)
    }
  }
  return found
}

async function controlHolds(rows: readonly Row[]): Promise<boolean> {
  const first = rows[0]
  if (first === undefined) {
    return false
  }
  const folder = await mkdtemp(join(tmpdir(), "rosesfield-generated-"))
  try {
    const bytes = await readFile(join(root, first.path))
    const edited = { path: "edited", sha256: first.sha256 }
    await writeFile(
      join(folder, edited.path),
      Buffer.concat([bytes, Buffer.from(" ")])
    )
    const removed = { path: "removed", sha256: first.sha256 }
    const caught = await refusals(folder, [edited, removed])
    return (
      caught.length === 2 &&
      caught[0]?.startsWith("edited:") === true &&
      caught[1] === "removed: listed in generated.json and missing"
    )
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}

const rows = rowsOf(await readFile(join(root, "generated.json"), "utf8"))
const found = await refusals(root, rows)
for (const line of found) {
  console.error(line)
}
const control = await controlHolds(rows)
console.log(
  `${rows.length} generated files checked, ${found.length} refused. The planted edit and the removed file were ${control ? "both caught" : "not both caught"}.`
)
process.exit(found.length === 0 && control ? 0 : 1)
