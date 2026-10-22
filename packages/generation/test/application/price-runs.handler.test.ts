import type { EngineBinding } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { PriceRunHandler } from "#application/price-run/price-run.handler"
import type { PriceRequest, RunPrice } from "#domain/generation-engine.port"
import type { ModelForm } from "#domain/model-form"
import { taskBinding } from "#domain/task-binding"
import { FakeAppCatalog } from "../fake/fake-app-catalog"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { fakeBinding, imageApp } from "../sample"

function formOf(model: string): ModelForm {
  return {
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
    ],
  }
}

const forms = Array.from({ length: 20 }, (_, at) => formOf(`maker/model-${at}`))

const app = imageApp(
  taskBinding({
    tasks: ["text-to-image"],
    input: "model",
    default: "open",
    fallback: fakeBinding,
  })
)

class CountingEngine extends FakeGenerationEngine {
  inFlight = 0
  most = 0

  override async priceOf(
    binding: EngineBinding,
    request: PriceRequest
  ): Promise<RunPrice> {
    this.inFlight += 1
    this.most = Math.max(this.most, this.inFlight)
    for (let turn = 0; turn < 5; turn += 1) {
      await Promise.resolve()
    }
    this.inFlight -= 1
    const model = String(request.inputs.model)
    const at = Number(model.split("-").at(-1))
    await super.priceOf(binding, request)
    return { source: "rates", credits: at + 0.5 }
  }
}

function handlerWith(engine: FakeGenerationEngine): PriceRunHandler {
  return new PriceRunHandler({
    apps: new FakeAppCatalog([app]),
    engines: [engine],
  })
}

describe("the prices of many models at one setting", () => {
  it("answers each ask in its own place, a few at a time", async () => {
    const engine = new CountingEngine({ forms })
    const asks = forms.map((form) => ({
      inputs: { model: form.model, prompt: "a door" },
    }))
    const { prices } = await handlerWith(engine).executeAll({
      appId: "sample-image",
      asks,
    })
    expect(prices.map((price) => price.credits)).toEqual(
      forms.map((_, at) => at + 0.5)
    )
    expect(engine.most).toBeGreaterThan(1)
    expect(engine.most).toBeLessThanOrEqual(PriceRunHandler.parallelAsks)
  })

  it("refuses an app it does not hold before it prices anything, the control", async () => {
    const engine = new CountingEngine({ forms })
    await expect(
      handlerWith(engine).executeAll({
        appId: "nowhere",
        asks: [{ inputs: { model: "maker/model-1", prompt: "a door" } }],
      })
    ).rejects.toMatchObject({ code: "APP_NOT_FOUND" })
    expect(engine.priced).toEqual([])
  })
})
