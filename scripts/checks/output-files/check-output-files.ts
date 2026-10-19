import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import {
  type Check,
  checkOutputFile,
  type Expected,
  type OutputKind,
} from "./file-checks"
import { ledgerRowsOf } from "./ledger-rows"
import { writePlanted } from "./planted-files"

type LibraryFile = { assetId: string; runId: string | null; expected: Expected }

function verdictLine(name: string, checks: readonly Check[]): string {
  const failed = checks.filter((one) => !one.pass)
  const state =
    failed.length === 0
      ? "pass"
      : `FAIL ${failed.map((one) => one.name).join(", ")}`
  return `${name}: ${state} | ${checks.map((one) => `${one.name} ${one.detail}`).join("; ")}`
}

async function runControls(): Promise<number> {
  const folder = await mkdtemp(join(tmpdir(), "rosesfield-planted-"))
  let missed = 0
  try {
    for (const planted of await writePlanted(folder)) {
      const checks = await checkOutputFile(planted.file, planted.expected)
      const failed = checks.filter((one) => !one.pass).map((one) => one.name)
      const caught =
        planted.defect === null
          ? failed.length === 0
          : failed.includes(planted.defect)
      missed += caught ? 0 : 1
      const label = `${basename(planted.file)} as ${planted.expected.kind}${planted.defect === null ? "" : `, planted: ${planted.defect}`}`
      console.log(
        `${caught ? "caught" : "MISSED"} ${verdictLine(label, checks)}`
      )
    }
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
  console.log(missed === 0 ? "every control held" : `${missed} controls missed`)
  return missed === 0 ? 0 : 1
}

function ratioOf(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const [width, height] = value.split(":").map(Number)
  return width !== undefined && height !== undefined && width > 0 && height > 0
    ? width / height
    : undefined
}

function kindOf(kind: unknown): OutputKind | null {
  return kind === "image" || kind === "video" || kind === "audio" ? kind : null
}

type Row = Record<string, unknown>

function rowOf(value: unknown): Row {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {}
}

async function rowsAt(url: string, key: string): Promise<Row[]> {
  const body = rowOf(await (await fetch(url)).json())
  const rows = body[key]
  return Array.isArray(rows) ? rows.map(rowOf) : []
}

function outputsOf(run: Row): unknown[] {
  return Array.isArray(run.outputs) ? run.outputs : []
}

async function libraryFiles(base: string): Promise<LibraryFile[]> {
  const runs = await rowsAt(`${base}/api/runs`, "runs")
  const assets = await rowsAt(`${base}/api/assets`, "assets")
  return assets.flatMap((asset) => {
    const kind = kindOf(asset.kind)
    const run = runs.find((one) => outputsOf(one).includes(asset.id))
    if (kind === null || run === undefined) {
      return []
    }
    const ratio =
      ratioOf(rowOf(run.inputs).aspectRatio) ?? ratioOf(run.aspectRatio)
    return [
      {
        assetId: String(asset.id),
        runId: String(run.id),
        expected: ratio === undefined ? { kind } : { kind, ratio },
      },
    ]
  })
}

async function runLibrary(base: string): Promise<number> {
  const folder = await mkdtemp(join(tmpdir(), "rosesfield-library-"))
  let failed = 0
  try {
    for (const file of await libraryFiles(base)) {
      const path = join(folder, file.assetId)
      await Bun.write(
        path,
        await (
          await fetch(`${base}/api/assets/${file.assetId}/content`)
        ).arrayBuffer()
      )
      const checks = await checkOutputFile(path, file.expected)
      failed += checks.every((one) => one.pass) ? 0 : 1
      console.log(
        verdictLine(`asset ${file.assetId} of run ${file.runId}`, checks)
      )
    }
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
  return failed === 0 ? 0 : 1
}

async function runLedger(base: string, since: string): Promise<number> {
  const body = rowOf(await (await fetch(`${base}/api/runs`)).json())
  const runs = Array.isArray(body.runs) ? body.runs : []
  for (const line of ledgerRowsOf(runs, new Date(since))) {
    console.log(line)
  }
  return 0
}

const [mode, base, since] = Bun.argv.slice(2)
if (mode === "--controls") {
  process.exit(await runControls())
} else if (mode === "--library" && base !== undefined) {
  process.exit(await runLibrary(base.replace(/\/$/, "")))
} else if (mode === "--ledger" && base !== undefined && since !== undefined) {
  process.exit(await runLedger(base.replace(/\/$/, ""), since))
} else {
  console.log(
    "Usage: bun scripts/checks/output-files/check-output-files.ts --controls | --library http://127.0.0.1:8787 | --ledger http://127.0.0.1:8787 2026-10-19T00:00:00Z"
  )
  process.exit(2)
}
