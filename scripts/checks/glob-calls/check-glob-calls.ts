import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Glob } from "bun"

const root = fileURLToPath(new URL("../../../", import.meta.url))

const sources = [
  "apps/*/{src,test,e2e}/**/*.{ts,tsx,js,mjs}",
  "packages/*/{src,test}/**/*.{ts,tsx,js,mjs}",
  "services/*/{src,test}/**/*.{ts,tsx,js,mjs}",
  "scripts/**/*.{ts,tsx,js,mjs}",
]

const call = ["import", "meta", "glob"].join(".")

export function refusalsOf(text: string): readonly number[] {
  const lines: number[] = []
  text.split("\n").forEach((line, index) => {
    let at = line.indexOf(call)
    while (at !== -1) {
      if (line[at + call.length] !== "(") {
        lines.push(index + 1)
      }
      at = line.indexOf(call, at + call.length)
    }
  })
  return lines
}

const planted = [
  `const typed = ${call}<string>("./a/*.png", { eager: true })`,
  `const spaced = ${call} ("./b/*.png")`,
  `const plain = ${call}("./c/*.png", { eager: true })`,
].join("\n")

function controlHolds(): boolean {
  const caught = refusalsOf(planted)
  return caught.length === 2 && caught[0] === 1 && caught[1] === 2
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
let refused = 0
for (const path of files) {
  for (const line of refusalsOf(await readFile(join(root, path), "utf8"))) {
    refused += 1
    console.error(
      `${path}:${line}: ${call} is not followed by "(". Vitest caches the transform of a file without the text "${call}(", so a file added later stays out of its list. Drop the type argument and type the result through its query or a check.`
    )
  }
}
const control = controlHolds()
console.log(
  `${files.length} files checked, ${refused} glob calls refused. The planted typed and spaced calls were ${control ? "both caught, and the plain call beside them passed" : "not caught as planted"}.`
)
process.exit(refused === 0 && control ? 0 : 1)
