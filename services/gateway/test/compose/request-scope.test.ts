import { buildPath, type Cost, routes, runResponse } from "@rosesfield/contract"
import { DemoGenerationEngine, type EngineStatus } from "@rosesfield/generation"
import { afterEach, describe, expect, it } from "vitest"
import type { HandlerPorts } from "#build-handlers"
import { visitorScope } from "#compose/request-scope"
import { ownerSettings } from "#compose/settings"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const charged: Cost = { amount: 1 / 211, currency: "USD" }

class LatePricedDemo extends DemoGenerationEngine {
  readonly done: EngineStatus[] = []
  release: () => void = () => undefined
  private readonly held = new Promise<void>((resolve) => {
    this.release = resolve
  })

  override creditsOf(cost: Cost): number {
    return cost.amount * 211
  }

  override async read(ref: string): Promise<EngineStatus> {
    const status = await super.read(ref)
    if (status.state !== "succeeded") {
      return status
    }
    if (this.done.length === 0) {
      this.done.push(status)
      return status
    }
    await this.held
    const priced: EngineStatus = { state: "succeeded", cost: charged }
    this.done.push(priced)
    return priced
  }
}

let gateway: Harness | null = null

afterEach(() => {
  gateway?.close()
  gateway = null
})

describe("a visitor's run poll", () => {
  it("answers once the run is done and hands its late price to the runtime", async () => {
    let ports: HandlerPorts | null = null
    let engine: LatePricedDemo | null = null
    gateway = harnessFor({
      portsFor: (clock, folder) => {
        engine = new LatePricedDemo({ clock })
        ports = { ...localPorts(clock, folder), engines: [engine] }
        return ports
      },
    })
    if (ports === null || engine === null) {
      throw new Error("no ports")
    }
    const held: HandlerPorts = ports
    const demo: LatePricedDemo = engine
    const started = await gateway.call(
      buildPath(routes.startRun.path, { appId: "sample-image" }),
      jsonInit({ inputs: { prompt: "a red door in fog" } })
    )
    const runId = runResponse.parse(await started.json()).run.id
    const deferred: Promise<void>[] = []
    const scope = visitorScope({
      sessionId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      handlers: gateway.handlers,
      runs: held.runs,
      engines: held.engines,
      settings: ownerSettings(
        {
          engine: { target: "demo" },
          access: { mode: "owner", lock: { mode: "local" } },
          agent: null,
        },
        "bun"
      ),
      agent: null,
      canAnswer: false,
      hold: () => () => undefined,
      defer: (work) => deferred.push(work),
    })

    await scope.pollRun(runId)
    gateway.clock.advance(DemoGenerationEngine.delayMs)
    await scope.pollRun(runId)
    const shown = await gateway.handlers.getRun.execute({ runId })
    expect(shown.run.status).toBe("done")
    expect(shown.run.cost).toBeNull()
    expect(deferred).toHaveLength(1)

    demo.release()
    await Promise.all(deferred)
    const priced = await gateway.handlers.getRun.execute({ runId })
    expect(priced.run.cost).toEqual(charged)
    expect(demo.done).toHaveLength(2)
  })
})
