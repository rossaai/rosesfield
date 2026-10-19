import type { AppDefinition } from "@rosesfield/contract"
import { FixedClock, type RunId, runIdFormat } from "@rosesfield/kernel"
import { AdvanceRunHandler } from "#application/advance-run/advance-run.handler"
import { CancelRunHandler } from "#application/cancel-run/cancel-run.handler"
import { GetRunHandler } from "#application/get-run/get-run.handler"
import { ListRunsHandler } from "#application/list-runs/list-runs.handler"
import { PriceRunHandler } from "#application/price-run/price-run.handler"
import { RepeatRunHandler } from "#application/repeat-run/repeat-run.handler"
import { StartRunHandler } from "#application/start-run/start-run.handler"
import type { GenerationEngine } from "#domain/generation-engine.port"
import type { ModelPolicy } from "#domain/model-policy.port"
import type { PriceBook } from "#domain/price-book.port"
import { FakeAppCatalog } from "../fake/fake-app-catalog"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakeJobRunner } from "../fake/fake-job-runner"
import { FakeRunAssets } from "../fake/fake-run-assets"
import { FakeRunRepository } from "../fake/fake-run-repository"
import { imageApp, start } from "../sample"

type HarnessOptions = {
  apps?: AppDefinition[]
  engines?: GenerationEngine[]
  policy?: ModelPolicy
  prices?: PriceBook
}

export type Harness = ReturnType<typeof harnessFor>

export function harnessFor(options: HarnessOptions = {}) {
  const clock = new FixedClock({ now: start })
  const runs = new FakeRunRepository()
  const jobs = new FakeJobRunner()
  const assets = new FakeRunAssets()
  const apps = new FakeAppCatalog(options.apps ?? [imageApp()])
  const engines = options.engines ?? [new FakeGenerationEngine()]
  const startRun = new StartRunHandler({
    apps,
    runs,
    engines,
    jobs,
    clock,
    ...(options.policy === undefined ? {} : { policy: options.policy }),
  })
  return {
    clock,
    runs,
    jobs,
    assets,
    start: startRun,
    advance: new AdvanceRunHandler({
      apps,
      runs,
      engines,
      assets,
      clock,
      ...(options.prices === undefined ? {} : { prices: options.prices }),
    }),
    price: new PriceRunHandler({
      apps,
      engines,
      ...(options.prices === undefined ? {} : { prices: options.prices }),
    }),
    cancel: new CancelRunHandler({ runs, engines, clock }),
    get: new GetRunHandler({ runs }),
    list: new ListRunsHandler({ runs }),
    repeat: new RepeatRunHandler({ runs, start: startRun }),
  }
}

export async function startImage(
  harness: Harness,
  body: unknown = { inputs: { prompt: "a red door in fog" } }
): Promise<RunId> {
  const { run } = await harness.start.execute({
    appId: "sample-image",
    body,
    idempotencyKey: null,
    seed: null,
  })
  return runIdFormat.parse(run.id)
}
