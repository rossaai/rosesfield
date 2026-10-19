import { run as runSchema } from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { describe, expect, it } from "vitest"
import { AdvanceRunHandler } from "#application/advance-run/advance-run.handler"
import { ListRunsHandler } from "#application/list-runs/list-runs.handler"
import { StartRunHandler } from "#application/start-run/start-run.handler"
import type { ModelForm } from "#domain/model-form"
import { taskBinding } from "#domain/task-binding"
import { migrateRunTable } from "#infrastructure/bun-sqlite-run-migration"
import { DrizzleRunRepository } from "#infrastructure/drizzle-run-repository"
import { FakeAppCatalog } from "../fake/fake-app-catalog"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakeJobRunner } from "../fake/fake-job-runner"
import { FakeModelPolicy } from "../fake/fake-model-policy"
import { FakeRunAssets } from "../fake/fake-run-assets"
import { fakeBinding, imageApp, start } from "../sample"

const model = "byteplus/seedream-5-0-flash-260915"

const randomSeedForm: ModelForm = {
  model,
  fields: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: 500,
      default: null,
    },
    {
      kind: "number",
      name: "seed",
      path: "seed",
      required: false,
      min: -1,
      max: 2_147_483_647,
      integer: true,
      default: -1,
    },
  ],
}

const taskApp = imageApp(
  taskBinding({
    tasks: ["text-to-image"],
    input: "model",
    default: "open",
    fallback: fakeBinding,
  })
)

function setup() {
  const db = drizzle(":memory:")
  migrateRunTable(db)
  const runs = new DrizzleRunRepository({ db })
  const engine = new FakeGenerationEngine({
    key: "fake-engine",
    forms: [randomSeedForm],
  })
  const apps = new FakeAppCatalog([taskApp])
  const clock = new FixedClock({ now: start })
  return {
    runs,
    engine,
    start: new StartRunHandler({
      apps,
      runs,
      engines: [engine],
      jobs: new FakeJobRunner(),
      clock,
      policy: new FakeModelPolicy([model]),
    }),
    list: new ListRunsHandler({ runs }),
    advance: new AdvanceRunHandler({
      apps,
      runs,
      engines: [engine],
      assets: new FakeRunAssets(),
      clock,
    }),
  }
}

async function startWithSeed(seed: number) {
  const subject = setup()
  const { run } = await subject.start.execute({
    appId: "sample-image",
    body: { inputs: { model, prompt: "A paper boat on a still pond", seed } },
    idempotencyKey: null,
    seed: null,
  })
  return { subject, run }
}

describe("a hosted run whose model form sends seed -1 for random", () => {
  it("keeps a record that obeys the run contract, with no seed of its own", async () => {
    const { run } = await startWithSeed(-1)
    expect(run.seed).toBeNull()
    expect(run.inputs.seed).toBe(-1)
    expect(runSchema.safeParse(run).success).toBe(true)
  })

  it("reads back from the repository and lists", async () => {
    const { subject, run } = await startWithSeed(-1)
    await expect(
      subject.runs.get(runIdFormat.parse(run.id))
    ).resolves.not.toBeNull()
    await expect(
      subject.list.execute({ appId: "sample-image", cursor: null })
    ).resolves.toMatchObject({ runs: [{ inputs: { seed: -1 } }] })
  })

  it("is sent once by the watcher, with -1 for the model", async () => {
    const { subject, run } = await startWithSeed(-1)
    await subject.advance.execute({ runId: runIdFormat.parse(run.id) })
    expect(subject.engine.submitted).toHaveLength(1)
    expect(subject.engine.submitted[0]?.inputs.seed).toBe(-1)
  })

  it("keeps seed 7 as the run's own seed", async () => {
    const { subject, run } = await startWithSeed(7)
    expect(runSchema.safeParse(run).success).toBe(true)
    const runId = runIdFormat.parse(run.id)
    const read = await subject.runs.get(runId)
    expect(read?.toRecord().seed).toBe(7)
    await subject.advance.execute({ runId })
    expect(subject.engine.submitted).toHaveLength(1)
  })
})
