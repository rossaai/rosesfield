import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import {
  listWorkflows,
  type Workflow,
} from "../../packages/catalog/src/workflow-registry"
import {
  ComfyGenerationEngine,
  type GenerationEngine,
  RunPodServerlessGenerationEngine,
} from "../../packages/generation/src/index"
import { type Samples, sampleText } from "./first-light-request"
import { fileNameOf, type Report, runWorkflow } from "./first-light-run"
import { type FirstLightTarget, readTarget } from "./first-light-target"

const root = fileURLToPath(new URL("../../", import.meta.url))

const mimes: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
}

export function engineFor(target: FirstLightTarget): GenerationEngine {
  return target.kind === "comfy"
    ? new ComfyGenerationEngine({
        apiKey: target.apiKey,
        baseUrl: target.baseUrl,
      })
    : new RunPodServerlessGenerationEngine({
        apiKey: target.apiKey,
        endpointId: target.endpointId,
      })
}

export function readSamples(folder: string | undefined): Samples {
  if (folder === undefined) {
    return {}
  }
  const samples: Samples = {}
  for (const name of readdirSync(folder)) {
    const kind = name.split(".")[0]
    const mime = mimes[extname(name).toLowerCase()]
    if (
      mime !== undefined &&
      (kind === "image" || kind === "video" || kind === "audio")
    ) {
      samples[kind] = {
        mime,
        bytes: new Uint8Array(readFileSync(join(folder, name))),
      }
    }
  }
  return samples
}

function readValues(
  file: string | undefined
): Readonly<Record<string, Readonly<Record<string, string | number>>>> {
  if (file === undefined) {
    return {}
  }
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"))
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${file} is not an object of workflow ids`)
  }
  return Object.fromEntries(
    Object.entries(parsed).map(([id, values]) => [
      id,
      typeof values === "object" && values !== null && !Array.isArray(values)
        ? Object.fromEntries(
            Object.entries(values).filter(
              (entry): entry is [string, string | number] =>
                typeof entry[1] === "string" || typeof entry[1] === "number"
            )
          )
        : {},
    ])
  )
}

export function summaryOf(reports: readonly Report[]): string {
  const rows = reports.map(
    (one) =>
      `| \`${one.workflow}\` | ${one.status} | ${one.seconds ?? "none"} | ${one.gpuSeconds ?? "none"} | ${one.cost === null ? "not reported" : JSON.stringify(one.cost)} | ${one.outputs.length} |`
  )
  return [
    "| Workflow | Status | Seconds | GPU seconds | Cost | Outputs |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n")
}

function chosen(only: string | undefined): readonly Workflow[] {
  const all = listWorkflows()
  if (only === undefined) {
    return all
  }
  const ids = only.split(",").map((id) => id.trim())
  const unknown = ids.filter((id) => !all.some((one) => one.id === id))
  if (unknown.length > 0) {
    throw new Error(`No workflow in workflows/ is named ${unknown.join(", ")}`)
  }
  return all.filter((one) => ids.includes(one.id))
}

type Plan = {
  target: FirstLightTarget
  out: string
  samples: Samples
  overrides: Readonly<Record<string, Readonly<Record<string, string | number>>>>
  workflows: readonly Workflow[]
  timeoutSeconds: number
}

function planOf(): Plan | string {
  const { values } = parseArgs({
    options: {
      only: { type: "string" },
      inputs: { type: "string" },
      values: { type: "string" },
      out: { type: "string" },
      timeout: { type: "string", default: "1800" },
    },
  })
  const read = readTarget(process.env)
  if (!read.ok) {
    return read.problem
  }
  const stamp = new Date().toISOString().replaceAll(":", "-")
  return {
    target: read.target,
    out: resolve(values.out ?? join(root, "data", "first-light", stamp)),
    samples: readSamples(values.inputs),
    overrides: readValues(values.values),
    workflows: chosen(values.only),
    timeoutSeconds: Number(values.timeout),
  }
}

async function main(): Promise<number> {
  const plan = planOf()
  if (typeof plan === "string") {
    console.error(plan)
    return 1
  }
  mkdirSync(plan.out, { recursive: true })
  const engine = engineFor(plan.target)
  const reports: Report[] = []
  for (const workflow of plan.workflows) {
    const { report, outputs } = await runWorkflow({
      engine,
      target: plan.target,
      workflow,
      samples: plan.samples,
      sampleText,
      values: plan.overrides[workflow.id] ?? {},
      now: () => Date.now(),
      sleep: (milliseconds) => Bun.sleep(milliseconds),
      fetch,
      pollSeconds: 5,
      timeoutSeconds: plan.timeoutSeconds,
      newId: () => crypto.randomUUID(),
    })
    outputs.forEach((output, index) => {
      writeFileSync(
        join(plan.out, fileNameOf(workflow.id, index, output.mime)),
        output.bytes
      )
    })
    writeFileSync(
      join(plan.out, `${workflow.id}.json`),
      `${JSON.stringify(report, null, 2)}\n`
    )
    console.log(
      `${workflow.id}: ${report.status}${report.reason === null ? "" : `, ${report.reason}`}`
    )
    reports.push(report)
  }
  writeFileSync(join(plan.out, "summary.md"), summaryOf(reports))
  console.log(`first-light: ${reports.length} reports in ${plan.out}`)
  return reports.some((one) => one.status === "failed") ? 1 : 0
}

if (import.meta.main) {
  process.exitCode = await main()
}
