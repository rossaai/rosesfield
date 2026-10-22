import type { AgentToolHandlers } from "@rosesfield/agent"
import { agentTools } from "@rosesfield/agent"
import { errorEnvelope } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { app, effectsApp } from "../../../../packages/catalog/src/effects/app"
import {
  effectsGateways,
  mcp,
  openEffects,
  parsedEffects,
  pngOf,
  refused,
  start,
  upload,
} from "../fixtures/effects-gateway"

describe("the effects app's refusals through the gateway", () => {
  const openGateway = effectsGateways()

  it("refuses an effect that has not passed, and starts nothing", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const error = await refused(gateway, {
      effect: "melt-away",
      image: [photo],
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a sound, which Effects does not take, and starts nothing", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const error = await refused(gateway, {
      effect: "push-into-eye",
      image: [photo],
      sound: "off",
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a run with no photo, and starts nothing", async () => {
    const error = await refused(openGateway(), { effect: "push-into-eye" })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a photo under 480 pixels on its short side, and starts nothing", async () => {
    const gateway = openGateway()
    const small = await upload(gateway, pngOf(640, 479))
    const error = await refused(gateway, {
      effect: "push-into-eye",
      image: [small],
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a photo stored as a format Effects does not take, and starts nothing", async () => {
    const gateway = openGateway()
    const gif = await upload(gateway, pngOf(1080, 1920), "image/gif")
    const error = await refused(gateway, {
      effect: "push-into-eye",
      image: [gif],
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses the same small photo through /mcp, and starts nothing", async () => {
    const gateway = openGateway()
    const small = await upload(gateway, pngOf(640, 479))
    const result = await mcp(gateway, "tools/call", {
      name: "effects",
      arguments: { inputs: { effect: "push-into-eye", image: [small] } },
    })
    expect(result).toMatchObject({ isError: true })
    expect(JSON.stringify(result)).toContain("RUN_INPUT_INVALID")
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses every run and lists no tool for /mcp or the agent while no effect has passed", async () => {
    const closed = parsedEffects(effectsApp([]))
    const gateway = openGateway(closed)
    const photo = await upload(gateway, pngOf(1080, 1920))
    const response = await start(gateway, { inputs: { image: [photo] } })
    expect(response.status).toBe(409)
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "APP_CLOSED"
    )
    expect(gateway.jobs.enqueued).toEqual([])
    const listed = await mcp(gateway, "tools/list", {})
    expect(JSON.stringify(listed)).not.toContain('"name":"effects"')
    const tools = agentTools({
      apps: [closed, openEffects()],
      handlers: () => ({}) as AgentToolHandlers,
    })
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["effects"])
    )
    expect(
      agentTools({
        apps: [closed],
        handlers: () => ({}) as AgentToolHandlers,
      }).map((tool) => tool.name)
    ).not.toContain("effects")
  })

  it("lists the effects tool for the agent from the shipped app, now that Push into eye has passed", () => {
    expect(
      agentTools({
        apps: [parsedEffects(app)],
        handlers: () => ({}) as AgentToolHandlers,
      }).map((tool) => tool.name)
    ).toContain("effects")
  })
})
