import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  accountResponse,
  accountRoutes,
  buildPath,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { readServerEnv } from "#env"
import { gatewayRoutes, settingsResponse } from "#gateway.contract"
import { keyHeaders } from "#session/visitor-keys"
import { type FakeComfy, fakeComfy } from "./fixtures/comfy-fetch"
import { imageApp, start } from "./sample-apps"

const pastedKey = "comfyui-pasted-in-settings"
const serverKey = "comfyui-from-the-environment"

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

function folder(): string {
  const made = mkdtempSync(join(tmpdir(), "rosesfield-pasted-"))
  folders.push(made)
  return made
}

function open(
  dataDir: string,
  comfy: FakeComfy,
  settings: Record<string, string> = {}
): LocalGateway {
  const gateway = composeLocalGateway({
    env: readServerEnv({ DATA_DIR: dataDir, ...settings }),
    apps: [imageApp()],
    clock: new FixedClock({ now: start }),
    platformRoot: null,
    fetch: comfy.fetch,
  })
  opened.push(gateway)
  return gateway
}

function call(
  gateway: LocalGateway,
  path: string,
  key: string | null,
  init: { method?: string; body?: string } = {}
): Promise<Response> {
  return Promise.resolve(
    gateway.app.request(`http://127.0.0.1:8787${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(key === null ? {} : { [keyHeaders.engine]: key }),
      },
    })
  )
}

async function settingsOf(gateway: LocalGateway, key: string | null) {
  const response = await call(gateway, gatewayRoutes.getSettings.path, key)
  return settingsResponse.parse(await response.json()).settings
}

async function runOf(gateway: LocalGateway, runId: string) {
  const path = buildPath(routes.getRun.path, { runId })
  const response = await call(gateway, path, null)
  return runResponse.parse(await response.json()).run
}

async function accountOf(gateway: LocalGateway, key: string) {
  const response = await call(gateway, accountRoutes.getAccount.path, key)
  return accountResponse.parse(await response.json()).account
}

async function startRun(gateway: LocalGateway, key: string | null) {
  const response = await call(
    gateway,
    buildPath(routes.startRun.path, { appId: "sample-image" }),
    key,
    { method: "POST", body: JSON.stringify({ inputs: { prompt: "a door" } }) }
  )
  expect(response.status).toBe(202)
  return runResponse.parse(await response.json()).run
}

function submitsWith(comfy: FakeComfy, key: string): boolean {
  return comfy.calls.some(
    (one) =>
      one.method === "POST" &&
      one.path === "/api/v2/jobs" &&
      one.authorization?.includes(key) === true
  )
}

async function untilSubmitted(comfy: FakeComfy, key: string): Promise<void> {
  for (let tick = 0; tick < 20 && !submitsWith(comfy, key); tick += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe("a key pasted in Settings on a server with no setting", () => {
  it("says Settings takes the key, and runs on the demo engine until you paste one", async () => {
    const gateway = open(folder(), fakeComfy())

    const settings = await settingsOf(gateway, null)
    const run = await startRun(gateway, null)

    expect(settings).toMatchObject({
      mode: "owner",
      lock: "local",
      keyFrom: "settings",
      engine: { target: "demo", key: "missing", origin: "demo" },
    })
    expect(run.origin).toBe("demo")
  })

  it("runs every request that carries the key on Comfy with that key", async () => {
    const comfy = fakeComfy()
    const gateway = open(folder(), comfy)

    const settings = await settingsOf(gateway, pastedKey)
    const account = await accountOf(gateway, pastedKey)
    const run = await startRun(gateway, pastedKey)
    await untilSubmitted(comfy, pastedKey)

    expect(settings).toMatchObject({
      mode: "owner",
      lock: "local",
      keyFrom: "settings",
      engine: { target: "comfy-cloud", key: "set", origin: "live" },
    })
    expect(account.key).toBe("valid")
    expect(run.origin).toBe("live")
    expect(submitsWith(comfy, pastedKey)).toBe(true)
  })

  it("keeps a run made on the key through a restart, and goes on with it when the key comes back", async () => {
    const dataDir = folder()
    const first = fakeComfy()
    const before = open(dataDir, first)
    const run = await startRun(before, pastedKey)
    await before.close()
    expect(submitsWith(first, pastedKey)).toBe(false)

    const comfy = fakeComfy()
    const after = open(dataDir, comfy)
    const resumedWithoutKey = await after.jobs.resume()
    const waiting = await runOf(after, run.id)
    await settingsOf(after, pastedKey)
    await untilSubmitted(comfy, pastedKey)

    expect(resumedWithoutKey).toBe(0)
    expect(waiting.status).toBe("queued")
    expect(submitsWith(comfy, pastedKey)).toBe(true)
  })
})

describe("a key set in the server's environment", () => {
  it("says the server holds the key, and never trades it for one a request carries", async () => {
    const comfy = fakeComfy()
    const gateway = open(folder(), comfy, { COMFY_API_KEY: serverKey })

    const settings = await settingsOf(gateway, pastedKey)
    await startRun(gateway, pastedKey)
    await untilSubmitted(comfy, serverKey)

    expect(settings.keyFrom).toBe("server")
    expect(submitsWith(comfy, serverKey)).toBe(true)
    expect(submitsWith(comfy, pastedKey)).toBe(false)
  })
})
