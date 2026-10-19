import type { EngineBinding } from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { ModelForm } from "#domain/model-form"
import { taskBinding } from "#domain/task-binding"
import { DemoGenerationEngine } from "#infrastructure/demo-generation-engine"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakeModelPolicy } from "../fake/fake-model-policy"
import { fakeBinding, imageApp, start } from "../sample"
import { harnessFor } from "./harness"

const model = "maker/picture-2"

const form: ModelForm = {
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
      kind: "choice",
      name: "aspectRatio",
      path: "aspect_ratio",
      required: false,
      options: ["1:1", "16:9"],
      default: "1:1",
    },
  ],
}

class KeylessRouter extends FakeGenerationEngine {
  override canRun(_binding: EngineBinding): boolean {
    return false
  }
}

const app = imageApp(
  taskBinding({
    tasks: ["text-to-image"],
    input: "model",
    default: model,
    fallback: fakeBinding,
  })
)

function harnessWith(forms: readonly ModelForm[]) {
  const clock = new FixedClock({ now: start })
  const demo = new DemoGenerationEngine({ clock })
  const router = new KeylessRouter({
    key: "comfy-router",
    forms,
    price: { source: "rates", credits: 135.78 },
  })
  const harness = harnessFor({
    apps: [app],
    engines: [router, demo],
    policy: new FakeModelPolicy([model]),
  })
  return { harness, clock }
}

describe("a task app's default with no engine key", () => {
  it("runs on the demo engine with the inputs its model's form checks", async () => {
    const { harness, clock } = harnessWith([form])
    const { run } = await harness.start.execute({
      appId: "sample-image",
      body: { inputs: { prompt: "a lighthouse", aspectRatio: "16:9" } },
      idempotencyKey: null,
      seed: null,
    })
    expect(run).toMatchObject({
      origin: "demo",
      engine: { adapter: "demo" },
      inputs: { model, prompt: "a lighthouse", aspectRatio: "16:9" },
    })
    const runId = runIdFormat.parse(run.id)
    await harness.advance.execute({ runId })
    clock.advance(DemoGenerationEngine.delayMs)
    await harness.advance.execute({ runId })
    expect((await harness.runs.get(runId))?.status).toBe("done")
  })

  it("prices the run as the demo engine prices it, not at the rate of an engine that cannot run it", async () => {
    const { harness } = harnessWith([form])
    const { price } = await harness.price.execute({
      appId: "sample-image",
      inputs: { prompt: "a lighthouse", model },
    })
    expect(price).toEqual({ source: "unknown", credits: null })
  })

  it("runs on the demo engine with the app's own inputs when no engine describes the model", async () => {
    const { harness } = harnessWith([])
    const { run } = await harness.start.execute({
      appId: "sample-image",
      body: { inputs: { prompt: "a lighthouse" } },
      idempotencyKey: null,
      seed: null,
    })
    expect(run).toMatchObject({
      origin: "demo",
      inputs: { prompt: "a lighthouse" },
    })
  })
})
