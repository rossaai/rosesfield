import { Database } from "bun:sqlite"
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

type Target =
  | { kind: "d1"; where: "--local" | "--remote"; isJudge: boolean }
  | { kind: "file"; dataDir: string }

type Plan = {
  shareId: string
  isRemoval: boolean
  target: Target
}

const gateway = fileURLToPath(
  new URL("../../services/gateway", import.meta.url)
)
const shareIdPattern = /^[A-Za-z0-9_-]{22}$/
const shareDays = 90
const dayMs = 86_400_000

const usage = [
  "bun scripts/deploy/explore.ts <share id> [--remove] (--local | --remote | --data-dir <folder>) [--judge]",
  "",
  "  Puts a shared output on Explore, where it stays until you remove it.",
  "  --remove    takes it off Explore, and its link ends 90 days after it was shared",
  "  --local     the database of wrangler's local runtime",
  "  --remote    the database of the Cloudflare deployment",
  "  --data-dir  the folder of a server that runs on bun, its DATA_DIR",
  "  --judge     the judge deployment's database, with --local or --remote",
].join("\n")

function targetOf(
  where: string | null,
  dataDir: string | null,
  isJudge: boolean
): Target {
  if (dataDir !== null && where === null) {
    return { kind: "file", dataDir }
  }
  if ((where === "--local" || where === "--remote") && dataDir === null) {
    return { kind: "d1", where, isJudge }
  }
  throw new Error(`Name one database.\n\n${usage}`)
}

function planOf(args: readonly string[]): Plan {
  let shareId: string | null = null
  let isRemoval = false
  let isJudge = false
  let where: string | null = null
  let dataDir: string | null = null
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? ""
    const value = args[index + 1]
    if (arg === "--remove") {
      isRemoval = true
    } else if (arg === "--judge") {
      isJudge = true
    } else if (arg === "--local" || arg === "--remote") {
      where = arg
    } else if (arg === "--data-dir" && value !== undefined) {
      dataDir = value
      index += 1
    } else if (shareId === null && shareIdPattern.test(arg)) {
      shareId = arg
    } else {
      throw new Error(`${arg} is not an option or a share id.\n\n${usage}`)
    }
  }
  if (shareId === null) {
    throw new Error(`Name a share id.\n\n${usage}`)
  }
  return { shareId, isRemoval, target: targetOf(where, dataDir, isJudge) }
}

function statementOf(plan: Plan): string {
  const placement = plan.isRemoval ? "link" : "explore"
  const expiresAt = plan.isRemoval
    ? `created_at + ${shareDays * dayMs}`
    : "NULL"
  return `UPDATE shares SET placement = '${placement}', expires_at = ${expiresAt} WHERE id = '${plan.shareId}'`
}

function placeInFile(plan: Plan, dataDir: string): number {
  const database = new Database(join(dataDir, "rosesfield.db"))
  try {
    return database.run(statementOf(plan)).changes
  } finally {
    database.close()
  }
}

function placeInD1(plan: Plan, target: Extract<Target, { kind: "d1" }>): void {
  const done = spawnSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "execute",
      target.isJudge ? "rosesfield-judge" : "rosesfield",
      target.where,
      `--env=${target.isJudge ? "judge" : ""}`,
      "--command",
      statementOf(plan),
    ],
    { cwd: gateway, stdio: "inherit", env: { ...process.env, CI: "true" } }
  )
  if (done.status !== 0) {
    throw new Error(`wrangler d1 execute stopped with ${done.status}`)
  }
}

try {
  const plan = planOf(process.argv.slice(2))
  if (plan.target.kind === "file") {
    const changed = placeInFile(plan, plan.target.dataDir)
    if (changed === 0) {
      throw new Error(`No share has the id ${plan.shareId}`)
    }
    console.log(
      plan.isRemoval
        ? `${plan.shareId} is off Explore`
        : `${plan.shareId} is on Explore`
    )
  } else {
    placeInD1(plan, plan.target)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
