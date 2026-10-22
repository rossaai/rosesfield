import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { errorEnvelope } from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { buildHandlers } from "#build-handlers"
import { ownerScope } from "#compose/request-scope"
import { ownerSettings } from "#compose/settings"
import type { OwnerLock } from "#env"
import { createGateway } from "#gateway"
import { gatewayRoutes } from "#gateway.contract"
import { TokenTries } from "#lock/token-tries"
import { FakeJobRunner } from "./fake/fake-job-runner"
import { localPorts } from "./local-ports"
import { ownerToken, start } from "./sample-apps"

const folders: string[] = []

afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function lockedGateway() {
  const clock = new FixedClock({ now: start })
  const folder = mkdtempSync(join(tmpdir(), "rosesfield-tries-"))
  folders.push(folder)
  const ports = localPorts(clock, folder)
  const { handlers } = buildHandlers(ports, () => new FakeJobRunner())
  const lock: OwnerLock = { mode: "token", token: ownerToken }
  const scope = ownerScope({
    handlers,
    agent: null,
    settings: ownerSettings(
      {
        engine: { target: "demo" },
        access: { mode: "owner", lock },
        agent: null,
      },
      "bun"
    ),
  })
  const app = createGateway({
    apps: ports.apps,
    guard: {
      mode: "owner",
      lock,
      tries: new TokenTries({ clock }),
      clientOf: (c) => c.req.header("x-test-client") ?? null,
    },
    scopeFor: async () => scope,
    agent: { mode: "routes" },
    platform: [],
  })
  const send = (token: string, client = "203.0.113.7") =>
    app.request(gatewayRoutes.getSettings.path, {
      headers: { authorization: `Bearer ${token}`, "x-test-client": client },
    })
  return { clock, send }
}

async function codeOf(response: Response): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

describe("the owner lock's limit on token tries", () => {
  it("refuses every try from a client after ten wrong tokens, the right one too, until the window passes", async () => {
    const { clock, send } = lockedGateway()
    for (let attempt = 0; attempt < TokenTries.maxTries; attempt += 1) {
      const wrong = await send(`${ownerToken.slice(0, -1)}x`)
      expect(wrong.status).toBe(401)
      expect(await codeOf(wrong)).toBe("OWNER_TOKEN_MISMATCH")
    }

    const locked = await send(ownerToken)
    const otherClient = await send(ownerToken, "198.51.100.4")
    clock.advance(TokenTries.windowMs)
    const later = await send(ownerToken)

    expect(locked.status).toBe(429)
    expect(await codeOf(locked)).toBe("OWNER_TOKEN_TRIES")
    expect(Number(locked.headers.get("retry-after"))).toBe(
      TokenTries.windowMs / 1000
    )
    expect(otherClient.status).toBe(200)
    expect(later.status).toBe(200)
  })

  it("forgets a client's wrong tries once it sends the right token", async () => {
    const { send } = lockedGateway()
    for (let attempt = 0; attempt < TokenTries.maxTries - 1; attempt += 1) {
      await send(`${ownerToken.slice(0, -1)}x`)
    }

    const right = await send(ownerToken)
    const wrongAgain = await send(`${ownerToken.slice(0, -1)}x`)
    const rightAgain = await send(ownerToken)

    expect(right.status).toBe(200)
    expect(wrongAgain.status).toBe(401)
    expect(rightAgain.status).toBe(200)
  })
})
