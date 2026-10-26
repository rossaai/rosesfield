import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { conversationRoutes } from "@rosesfield/agent"
import { errorEnvelope } from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { pastedKeyAgent } from "#agent/local-agent"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { PastedKeys } from "#compose/pasted-keys"
import { readServerEnv } from "#env"
import { gatewayRoutes, settingsResponse } from "#gateway.contract"
import { keyHeaders } from "#session/visitor-keys"
import { fakeComfy } from "./fixtures/comfy-fetch"
import { type Seen, Visitor } from "./fixtures/visitor"
import { imageApp, sessionSecret, start } from "./sample-apps"

const key = "comfyui-pasted-in-settings"

const opened: LocalGateway[] = []
const folders: string[] = []

afterEach(async () => {
  for (const gateway of opened.splice(0)) {
    await gateway.close()
  }
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function open(settings: Record<string, string>): LocalGateway {
  const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-key-agent-"))
  folders.push(dataDir)
  const gateway = composeLocalGateway({
    env: readServerEnv({ DATA_DIR: dataDir, ...settings }),
    apps: [imageApp()],
    clock: new FixedClock({ now: start }),
    platformRoot: null,
    fetch: fakeComfy().fetch,
  })
  opened.push(gateway)
  return gateway
}

type Caller = (path: string, init?: RequestInit) => Promise<Response>

function ownerCaller(gateway: LocalGateway, held: string | null = key): Caller {
  return (path, init = {}) =>
    Promise.resolve(
      gateway.app.request(`http://127.0.0.1:8787${path}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...(held === null ? {} : { [keyHeaders.engine]: held }),
        },
      })
    )
}

function publicCaller(gateway: LocalGateway): Caller {
  const visitor = new Visitor({
    app: gateway.app,
    keys: { [keyHeaders.engine]: key, "content-type": "application/json" },
    seen: [] as Seen[],
  })
  return (path, init = {}) =>
    visitor.call(path, {
      ...(init.method === undefined ? {} : { method: init.method }),
      ...(init.body === undefined || init.body === null
        ? {}
        : { body: init.body }),
    })
}

async function agentWith(call: Caller) {
  const settings = settingsResponse.parse(
    await (await call(gatewayRoutes.getSettings.path)).json()
  ).settings
  const started = await call(conversationRoutes.startConversation.path, {
    method: "POST",
    body: "{}",
  })
  const code =
    started.status === 201
      ? null
      : errorEnvelope.parse(await started.json()).error.code
  return {
    keyFrom: settings.keyFrom,
    engine: settings.engine.origin,
    agent: settings.agent.model,
    started: started.status,
    code,
  }
}

const runsOnTheKey = {
  keyFrom: "settings",
  engine: "live",
  agent: "set",
  started: 201,
  code: null,
}

describe("a Comfy key the browser holds and sends with every request", () => {
  it("turns the agent on when the key is pasted in Settings on a server with no key (bun run dev)", async () => {
    const gateway = open({})

    expect(await agentWith(ownerCaller(gateway))).toEqual(runsOnTheKey)
  })

  it("control: turns the agent on for the same key in public mode", async () => {
    const gateway = open({
      MODE: "public",
      HOST: "0.0.0.0",
      SESSION_SECRET: sessionSecret,
    })

    expect(await agentWith(publicCaller(gateway))).toEqual(runsOnTheKey)
  })

  it("control: keeps the agent off on the same server while no key is pasted", async () => {
    const gateway = open({})

    expect(await agentWith(ownerCaller(gateway, null))).toMatchObject({
      keyFrom: "settings",
      engine: "demo",
      agent: "missing",
    })
  })

  it("gives each pasted key its own agent, so one key never pays for another key's turn", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-key-agents-"))
    folders.push(dataDir)
    const vars = readServerEnv({ DATA_DIR: dataDir })
    const pasted = new PastedKeys({
      vars,
      build: () => {
        throw new TypeError("this test builds no handlers")
      },
      agent: () =>
        pastedKeyAgent({
          env: vars,
          apps: [imageApp()],
          clock: new FixedClock({ now: start }),
          modelOptions: {},
        }),
    })

    const first = pasted.agentOf("comfyui-first-key")
    const second = pasted.agentOf("comfyui-second-key")

    expect(first).not.toBeNull()
    expect(second).not.toBe(first)
    expect(pasted.agentOf("comfyui-first-key")).toBe(first)
    void pasted.stop()
  })
})
