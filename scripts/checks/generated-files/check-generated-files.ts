import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

type Row = { path: string; sha256: string }

const root = new URL("../../../", import.meta.url).pathname

function rowsOf(text: string): readonly Row[] {
  const parsed: unknown = JSON.parse(text)
  const files = (parsed as { files?: unknown }).files
  if (!Array.isArray(files)) {
    throw new Error("generated.json holds no files list")
  }
  return files.map((file: Partial<Row>) => {
    if (typeof file.path !== "string" || typeof file.sha256 !== "string") {
      throw new Error("generated.json holds a row with no path or sha256")
    }
    return { path: file.path, sha256: file.sha256 }
  })
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
    await writeFile(
      join(folder, "planted"),
      Buffer.concat([bytes, Buffer.from(" ")])
    )
    const planted = await refusals(folder, [
      { path: "planted", sha256: first.sha256 },
    ])
    return planted.length === 1
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
  `${rows.length} generated files checked, ${found.length} refused. The planted edit was ${control ? "caught" : "MISSED"}.`
)
process.exit(found.length === 0 && control ? 0 : 1)
