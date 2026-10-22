import { readFileSync } from "node:fs"
import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { EngineRequest } from "#domain/generation-engine.port"
import { hostedModelBinding } from "#domain/task-binding"
import { ComfyGenerationEngine } from "#infrastructure/comfy-generation-engine"
import { ComfyRouterGenerationEngine } from "#infrastructure/comfy-router-generation-engine"
import { CreditMeter } from "#infrastructure/credit-meter"
import { RouterCatalog } from "#infrastructure/router/router-catalog"
import { start } from "../sample"
import {
  balance,
  catalogPage,
  pictureModel,
  pictureSchema,
  queueStatus,
  schemaRead,
  submitted,
} from "./fixtures/comfy-router"
import {
  cloudUrl,
  comfyV2At,
  proxyUrl,
  succeededJob,
  workflowBinding,
} from "./fixtures/comfy-v2"
import { type Recording, ReplayFetch } from "./replay-fetch"

function meter(): CreditMeter {
  return new CreditMeter({
    clock: new FixedClock({ now: start }),
    wait: async () => undefined,
  })
}

function request(binding: EngineRequest["binding"]): EngineRequest {
  return {
    idempotencyKey: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
    binding,
    inputs: { prompt: "a red door" },
    files: [],
    count: 1,
    aspectRatio: null,
    seed: 42,
    outputKind: "image",
  }
}

function balanceReads(replay: ReplayFetch): number {
  const reads = replay.sent.filter((one) => one.url.endsWith("/balance"))
  return reads.length
}

function routerWith(recordings: Recording[]) {
  const replay = new ReplayFetch(recordings)
  const engine = new ComfyRouterGenerationEngine({
    apiKey: "comfyui-key",
    catalog: new RouterCatalog({ clock: new FixedClock({ now: start }) }),
    meter: meter(),
    fetch: replay.fetch,
  })
  return { engine, replay }
}

describe("the real credits of a run", () => {
  it("are read inside the time a Router submit claims", () => {
    const { engine } = routerWith([])
    const longest =
      ComfyRouterGenerationEngine.downloadTimeoutMs +
      (CreditMeter.settleTries - 1) * CreditMeter.settleMs
    expect(engine.submitLimitMs()).toBeGreaterThan(longest)
  })

  it("come from the balance route before and after a Router run, read after its done read", async () => {
    const { engine, replay } = routerWith([
      catalogPage([pictureModel]),
      schemaRead(pictureModel, pictureSchema),
      balance(1000),
      submitted(),
      queueStatus("COMPLETED"),
      queueStatus("COMPLETED"),
      balance(999.5),
      balance(999.5),
    ])
    const submission = await engine.submit(
      request(hostedModelBinding(pictureModel))
    )
    expect(await engine.read(submission.ref)).toEqual({ state: "succeeded" })
    expect(balanceReads(replay)).toBe(1)
    expect(await engine.read(submission.ref)).toEqual({
      state: "succeeded",
      cost: { amount: 1.055 / 211, currency: "USD" },
    })
    expect(balanceReads(replay)).toBe(3)
    expect(replay.unused()).toEqual([])
  })

  it("price a graph second at the RTX PRO 6000 rate docs/stack.md lists for Comfy Cloud", () => {
    const stack = readFileSync(
      new URL("../../../../docs/stack.md", import.meta.url),
      "utf8"
    )
    const usdPerHour = Number(/RTX PRO 6000 ([\d.]+) USD/.exec(stack)?.[1])
    const creditsPerUsd = Number(/at (\d+) credits per USD/.exec(stack)?.[1])
    const perSecond = (usdPerHour * creditsPerUsd) / 3600
    expect(Math.round(perSecond * 1000) / 1000).toBe(
      ComfyGenerationEngine.gpuCreditsPerSecond
    )
  })

  it("come from the execution_ms Comfy reports at the GPU rate for a graph on Comfy Cloud", async () => {
    const v2 = comfyV2At(cloudUrl)
    const replay = new ReplayFetch([v2.submit(), v2.read(succeededJob)])
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-key",
      fetch: replay.fetch,
    })
    const submission = await engine.submit(request(workflowBinding))
    const status = await engine.read(submission.ref)
    expect(status).toEqual({
      state: "succeeded",
      cost: { amount: 11.172 / 211, currency: "USD" },
    })
    expect(replay.unused()).toEqual([])
  })

  it("come from the balance route before and after a graph run on Comfy Cloud, read after its done read", async () => {
    const v2 = comfyV2At(cloudUrl)
    const replay = new ReplayFetch([
      balance(1000),
      v2.submit(),
      v2.read(succeededJob),
      v2.read(succeededJob),
      balance(999.72),
      balance(999.72),
    ])
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-key",
      meter: meter(),
      fetch: replay.fetch,
    })
    const submission = await engine.submit(request(workflowBinding))
    expect(await engine.read(submission.ref)).toEqual({ state: "succeeded" })
    expect(balanceReads(replay)).toBe(1)
    expect(await engine.read(submission.ref)).toEqual({
      state: "succeeded",
      cost: { amount: 0.5908 / 211, currency: "USD" },
    })
    expect(balanceReads(replay)).toBe(3)
    expect(replay.unused()).toEqual([])
  })

  it("keep the execution_ms figure for a graph run whose balance never moved", async () => {
    const v2 = comfyV2At(cloudUrl)
    const unmoved = Array.from({ length: CreditMeter.settleTries + 1 }, () =>
      balance(1000)
    )
    const replay = new ReplayFetch([
      ...unmoved,
      v2.submit(),
      v2.read(succeededJob),
      v2.read(succeededJob),
    ])
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-key",
      meter: meter(),
      fetch: replay.fetch,
    })
    const submission = await engine.submit(request(workflowBinding))
    expect(await engine.read(submission.ref)).toEqual({ state: "succeeded" })
    expect(await engine.read(submission.ref)).toEqual({
      state: "succeeded",
      cost: { amount: 11.172 / 211, currency: "USD" },
    })
    expect(replay.unused()).toEqual([])
  })

  it("are not read for a graph on your own ComfyUI", async () => {
    const v2 = comfyV2At(proxyUrl)
    const replay = new ReplayFetch([v2.submit(), v2.read(succeededJob)])
    const engine = new ComfyGenerationEngine({
      apiKey: null,
      baseUrl: proxyUrl,
      fetch: replay.fetch,
    })
    const submission = await engine.submit(request(workflowBinding))
    expect(await engine.read(submission.ref)).toEqual({
      state: "succeeded",
      cost: null,
    })
  })
})
