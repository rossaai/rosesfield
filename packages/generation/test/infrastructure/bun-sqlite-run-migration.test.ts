import { Database } from "bun:sqlite"
import { readFileSync } from "node:fs"
import { appIdFormat, runIdFormat } from "@rosesfield/kernel"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { describe, expect, it } from "vitest"
import { DrizzleRunRepository } from "#infrastructure/drizzle-run-repository"
import { portraitId } from "../sample"

const runId = runIdFormat.parse("1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f")
const doneId = runIdFormat.parse("6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d")

function statementsOf(name: string): string[] {
  const path = new URL(`../../drizzle/${name}.sql`, import.meta.url)
  return readFileSync(path, "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement !== "")
}

function insertOldRun(
  sqlite: Database,
  id: string,
  status: string,
  ref: string | null,
  outputs: string
): void {
  sqlite
    .query(
      `INSERT INTO runs (id, app_id, status, inputs, count, aspect_ratio, seed,
        outputs, progress, engine_adapter, engine_models, workflow_hash,
        engine_ref, cost_amount, origin, failure_code, failure_status,
        idempotency_key, attempts, version, created_at, finished_at)
       VALUES (?, 'sample-image', ?, '{"prompt":"a door"}', 1, NULL, 42, ?,
        0.5, 'comfy-workflow', '[]', NULL, ?, NULL, 'live', NULL, NULL, NULL,
        0, 3, 1792227694248, NULL)`
    )
    .run(id, status, outputs, ref)
}

describe("the run jobs migration", () => {
  it("turns the engine reference of a stored run into its one job", async () => {
    const sqlite = new Database(":memory:")
    for (const statement of statementsOf("0000_runs")) {
      sqlite.run(statement)
    }
    insertOldRun(sqlite, runId, "running", "job-7", "[]")
    insertOldRun(sqlite, doneId, "done", "job-8", JSON.stringify([portraitId]))
    for (const statement of statementsOf("0001_run_jobs")) {
      sqlite.run(statement)
    }
    const runs = new DrizzleRunRepository({ db: drizzle({ client: sqlite }) })
    const running = await runs.get(runId)
    expect(running?.appId).toBe(appIdFormat.parse("sample-image"))
    expect(running?.jobs).toEqual([
      {
        index: 0,
        seed: 42,
        ref: "job-7",
        status: "queued",
        progress: 0.5,
        outputs: [],
      },
    ])
    expect((await runs.get(doneId))?.jobs[0]).toMatchObject({
      status: "done",
      outputs: [portraitId],
    })
  })
})
