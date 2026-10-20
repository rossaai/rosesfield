import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseSync } from "@swc/core"
import { Glob } from "bun"

type Node = { readonly type?: unknown; readonly [field: string]: unknown }

const root = fileURLToPath(new URL("../../../", import.meta.url))

const sources = ["apps/*/src/**/*.tsx", "packages/*/src/**/*.tsx"]

const shownAttributes: ReadonlySet<string> = new Set([
  "alt",
  "aria-description",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "label",
  "placeholder",
  "title",
])

const codeElements: ReadonlySet<string> = new Set([
  "code",
  "kbd",
  "pre",
  "samp",
])

const copyKey = /^[a-z][\w-]*(\.[\w-]+)+$/

const letter = /\p{L}/u

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null
}

function nameOf(node: unknown): string {
  return isNode(node) && typeof node.value === "string" ? node.value : ""
}

function textOf(node: unknown): string | null {
  if (!isNode(node)) {
    return null
  }
  if (node.type === "StringLiteral" && typeof node.value === "string") {
    return node.value
  }
  if (node.type === "JSXExpressionContainer") {
    return textOf(node.expression)
  }
  if (
    node.type === "TemplateLiteral" &&
    Array.isArray(node.expressions) &&
    node.expressions.length === 0 &&
    Array.isArray(node.quasis)
  ) {
    const quasi: unknown = node.quasis[0]
    return isNode(quasi) && typeof quasi.cooked === "string"
      ? quasi.cooked
      : null
  }
  return null
}

function shown(text: string): boolean {
  return letter.test(text) && !copyKey.test(text.trim())
}

function walk(value: unknown, inCode: boolean, found: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, inCode, found)
    }
    return
  }
  if (!isNode(value)) {
    return
  }
  if (value.type === "JSXElement" || value.type === "JSXFragment") {
    const opening = isNode(value.opening) ? value.opening : null
    const code = inCode || codeElements.has(nameOf(opening?.name))
    const attributes = Array.isArray(opening?.attributes)
      ? opening.attributes
      : []
    for (const attribute of attributes) {
      if (!isNode(attribute) || attribute.type !== "JSXAttribute") {
        walk(attribute, code, found)
        continue
      }
      const name = nameOf(attribute.name)
      const text = textOf(attribute.value)
      if (shownAttributes.has(name) && text !== null && shown(text)) {
        found.push(`${name}=${JSON.stringify(text)}`)
      }
      walk(attribute.value, code, found)
    }
    const children = Array.isArray(value.children) ? value.children : []
    for (const child of children) {
      const text =
        isNode(child) && child.type === "JSXText"
          ? String(child.value)
          : isNode(child) && child.type === "JSXExpressionContainer"
            ? textOf(child)
            : null
      if (!code && text !== null && letter.test(text)) {
        found.push(`text ${JSON.stringify(text.trim())}`)
      }
      walk(child, code, found)
    }
    return
  }
  for (const field of Object.values(value)) {
    walk(field, inCode, found)
  }
}

export function refusalsOf(source: string): readonly string[] {
  const module = parseSync(source, { syntax: "typescript", tsx: true })
  const found: string[] = []
  walk(module.body, false, found)
  return found
}

async function generatedPaths(): Promise<ReadonlySet<string>> {
  const parsed: unknown = JSON.parse(
    await readFile(join(root, "generated.json"), "utf8")
  )
  const files =
    isNode(parsed) && Array.isArray(parsed.files) ? parsed.files : []
  return new Set(
    files.map((file: unknown) =>
      isNode(file) && typeof file.path === "string" ? file.path : ""
    )
  )
}

async function scannedFiles(): Promise<readonly string[]> {
  const generated = await generatedPaths()
  const files: string[] = []
  for (const pattern of sources) {
    for await (const path of new Glob(pattern).scan({ cwd: root })) {
      if (!generated.has(path) && !/\.test\.tsx$/.test(path)) {
        files.push(path)
      }
    }
  }
  return files.sort()
}

const planted = `export function Planted() {
  return (
    <section aria-label="Planted label" className="flex gap-s2" data-state="open">
      <h2>Planted heading</h2>
      {"Planted line"}
      <code>POST /runs</code>
      <Field label="sample.source.upload" title={title} />
    </section>
  )
}
`

const plantedRefusals = [
  'aria-label="Planted label"',
  'text "Planted heading"',
  'text "Planted line"',
]

function controlHolds(): boolean {
  const caught = refusalsOf(planted)
  return (
    caught.length === plantedRefusals.length &&
    plantedRefusals.every((line, index) => caught[index] === line)
  )
}

const files = await scannedFiles()
let refused = 0
for (const path of files) {
  for (const line of refusalsOf(await readFile(join(root, path), "utf8"))) {
    refused += 1
    console.error(
      `${path}: ${line} is typed in the code. Words a person reads live in a generated copy file.`
    )
  }
}
const control = controlHolds()
console.log(
  `${files.length} screen and component files checked, ${refused} typed strings refused. The planted strings were ${control ? "all caught, and the code, class and key beside them passed" : "not caught as planted"}.`
)
process.exit(refused === 0 && control ? 0 : 1)
