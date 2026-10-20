import { FixedClock } from "@rosesfield/kernel"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ComfyGenerationEngine } from "#infrastructure/comfy-generation-engine"
import { ComfyRouterGenerationEngine } from "#infrastructure/comfy-router-generation-engine"
import { RouterCatalog } from "#infrastructure/router/router-catalog"
import { start } from "../sample"

const calls: string[] = []

function workerdFetch(
  this: unknown,
  input: string | URL | Request
): Promise<Response> {
  if (this !== undefined && this !== globalThis) {
    throw new TypeError("Illegal invocation")
  }
  const url = input instanceof Request ? input.url : input.toString()
  calls.push(url)
  return Promise.resolve(
    url.includes("/api/v2/jobs/")
      ? Response.json({ code: "job_not_found" }, { status: 404 })
      : Response.json({ data: [], has_more: false })
  )
}

beforeEach(() => {
  calls.length = 0
  vi.stubGlobal("fetch", workerdFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("an engine built with the runtime's own fetch", () => {
  it("calls fetch on its own, as workerd requires, on the Router", async () => {
    const engine = new ComfyRouterGenerationEngine({
      apiKey: "comfyui-key",
      catalog: new RouterCatalog({ clock: new FixedClock({ now: start }) }),
    })
    expect(await engine.checkKey()).toBe("valid")
    expect(calls).toHaveLength(1)
  })

  it("calls fetch on its own, as workerd requires, on Comfy Cloud", async () => {
    const engine = new ComfyGenerationEngine({ apiKey: "comfyui-key" })
    expect(await engine.checkKey()).toBe("valid")
    expect(calls).toHaveLength(1)
  })
})
