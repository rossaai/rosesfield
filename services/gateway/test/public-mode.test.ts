import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  assetPageResponse,
  assetResponse,
  buildPath,
  characterListResponse,
  characterResponse,
  errorEnvelope,
  routes,
  runPageResponse,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { readServerEnv } from "#env"
import { gatewayRoutes, settingsResponse } from "#gateway.contract"
import { keyHeaders } from "#session/visitor-keys"
import {
  accountPath,
  balancePath,
  type ComfyCall,
  type FakeComfy,
  fakeComfy,
} from "./fixtures/comfy-fetch"
import { type Seen, Visitor } from "./fixtures/visitor"
import { imageApp, pngBytes, sessionSecret, start } from "./sample-apps"

const folders: string[] = []
let gateway: LocalGateway | null = null

afterEach(async () => {
  await gateway?.close()
  gateway = null
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function folder(): string {
  const made = mkdtempSync(join(tmpdir(), "rosesfield-public-"))
  folders.push(made)
  return made
}

type PublicOptions = {
  settings?: Record<string, string>
  clock?: FixedClock
}

function openPublic(options: PublicOptions = {}) {
  const dataDir = folder()
  const comfy = fakeComfy()
  const clock = options.clock ?? new FixedClock({ now: start })
  const env = readServerEnv({
    MODE: "public",
    HOST: "0.0.0.0",
    SESSION_SECRET: sessionSecret,
    DATA_DIR: dataDir,
    ...options.settings,
  })
  gateway = composeLocalGateway({
    env,
    apps: [imageApp()],
    clock,
    platformRoot: null,
    fetch: comfy.fetch,
  })
  const seen: Seen[] = []
  const visitor = (keys: Record<string, string> = {}) =>
    new Visitor({ app: gateway?.app ?? fail(), keys, seen })
  return { dataDir, comfy, clock, seen, visitor, gateway }
}

function engineCalls(comfy: FakeComfy): ComfyCall[] {
  return comfy.calls.filter(
    (call) => call.path !== accountPath && call.path !== balancePath
  )
}

function fail(): never {
  throw new Error("The gateway is closed")
}

async function codeOf(response: Response): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

function startImage(visitor: Visitor, headers: Record<string, string> = {}) {
  return visitor.call(
    buildPath(routes.startRun.path, { appId: "sample-image" }),
    {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ inputs: { prompt: "a red door" } }),
    }
  )
}

describe("the settings of public mode", () => {
  it("start without an owner token on any address, and refuse every key of the deployment's own", () => {
    const base = {
      MODE: "public",
      HOST: "0.0.0.0",
      SESSION_SECRET: sessionSecret,
    }
    expect(readServerEnv(base).access).toEqual({
      mode: "public",
      sessionSecret,
      retentionDays: 7,
      requestsPerMinute: 120,
    })
    for (const name of ["COMFY_API_KEY", "RUNPOD_API_KEY", "AGENT_API_KEY"]) {
      expect(() => readServerEnv({ ...base, [name]: "a-key" })).toThrow(
        new RegExp(`${name} is set`)
      )
    }
    expect(() =>
      readServerEnv({ ...base, OWNER_TOKEN: sessionSecret })
    ).toThrow(/OWNER_TOKEN is set/)
    expect(() => readServerEnv({ MODE: "public" })).toThrow(
      /SESSION_SECRET is missing/
    )
  })
})

describe("a public deployment", () => {
  it("gives each new visitor a signed session cookie, and a new one for a forged cookie", async () => {
    const { visitor } = openPublic()
    const first = visitor()

    const response = await first.call(gatewayRoutes.getSettings.path)
    const cookie = response.headers.get("set-cookie") ?? ""
    const kept = first.cookie
    await first.call(gatewayRoutes.getSettings.path)
    const forged = visitor()
    forged.cookie = `${crypto.randomUUID()}.forged`
    await forged.call(gatewayRoutes.getSettings.path)

    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("SameSite=Lax")
    expect(cookie).toContain("Secure")
    expect(first.cookie).toBe(kept)
    expect(forged.cookie).not.toContain("forged")
    expect(
      settingsResponse.parse(await response.json()).settings
    ).toMatchObject({
      mode: "public",
      lock: "none",
      engine: { target: "comfy-cloud", key: "missing", origin: "demo" },
    })
  })

  it("keeps each visitor's runs, assets and characters from every other visitor", async () => {
    const { visitor } = openPublic()
    const owner = visitor()
    const stranger = visitor()
    const uploaded = await owner.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: pngBytes,
    })
    const { asset } = assetResponse.parse(await uploaded.json())
    const created = await owner.call(routes.createCharacter.path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ada", references: [asset.id], notes: "" }),
    })
    const { character } = characterResponse.parse(await created.json())
    const { run } = runResponse.parse(
      await (await startImage(owner, { "idempotency-key": "same-key" })).json()
    )

    const strangerRuns = runPageResponse.parse(
      await (await stranger.call(routes.listRuns.path)).json()
    )
    const strangerAssets = assetPageResponse.parse(
      await (await stranger.call(routes.listAssets.path)).json()
    )
    const strangerCharacters = characterListResponse.parse(
      await (await stranger.call(routes.listCharacters.path)).json()
    )
    const readRun = await stranger.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    const readAsset = await stranger.call(
      buildPath(routes.readAssetContent.path, { assetId: asset.id })
    )
    const deleteCharacter = await stranger.call(
      buildPath(routes.deleteCharacter.path, { characterId: character.id }),
      { method: "DELETE" }
    )
    const sameKey = runResponse.parse(
      await (
        await startImage(stranger, { "idempotency-key": "same-key" })
      ).json()
    )
    const ownRuns = runPageResponse.parse(
      await (await owner.call(routes.listRuns.path)).json()
    )
    const ownCharacters = characterListResponse.parse(
      await (await owner.call(routes.listCharacters.path)).json()
    )

    expect(strangerRuns.runs).toEqual([])
    expect(strangerAssets.assets).toEqual([])
    expect(strangerCharacters.characters).toEqual([])
    expect(readRun.status).toBe(404)
    expect(await codeOf(readRun)).toBe("RUN_NOT_FOUND")
    expect(readAsset.status).toBe(404)
    expect(deleteCharacter.status).toBe(404)
    expect(sameKey.run.id).not.toBe(run.id)
    expect(ownRuns.runs.map((one) => one.id)).toEqual([run.id])
    expect(ownCharacters.characters.map((one) => one.id)).toEqual([
      character.id,
    ])
  })

  it("runs on the visitor's own engine key and moves the run forward while the visitor reads it", async () => {
    const { visitor, comfy } = openPublic()
    const keyed = visitor({ [keyHeaders.engine]: "comfyui-visitor-key" })
    const keyless = visitor()

    const live = runResponse.parse(await (await startImage(keyed)).json()).run
    const demo = runResponse.parse(await (await startImage(keyless)).json()).run
    const path = buildPath(routes.getRun.path, { runId: live.id })
    const first = runResponse.parse(await (await keyed.call(path)).json()).run
    const second = runResponse.parse(await (await keyed.call(path)).json()).run

    expect(live.origin).toBe("live")
    expect(demo.origin).toBe("demo")
    expect(first.status).toBe("queued")
    expect(second.status).toBe("done")
    expect(second.outputs).toHaveLength(1)
    expect(
      engineCalls(comfy).map((call) => `${call.method} ${call.path}`)
    ).toEqual([
      "POST /api/v2/jobs",
      "GET /api/v2/jobs/7f3d2c1b-9a8e-4d6f-b012-3c4d5e6f7a8b",
      "GET /api/v2/jobs/7f3d2c1b-9a8e-4d6f-b012-3c4d5e6f7a8b",
      "GET /api/v2/assets/2b3e4f56-8a7b-4c2d-9e4f-5a6b9f8a1c0d/content",
    ])
    expect(
      engineCalls(comfy).every(
        (call) => call.authorization === "Bearer comfyui-visitor-key"
      )
    ).toBe(true)
  })

  it("leaves a live run waiting and closed while its visitor reads it without the key", async () => {
    const { visitor, comfy } = openPublic()
    const keyed = visitor({ [keyHeaders.engine]: "comfyui-visitor-key" })
    const live = runResponse.parse(await (await startImage(keyed)).json()).run
    const withoutKey = keyed.withoutKeys()

    const read = await withoutKey.call(
      buildPath(routes.getRun.path, { runId: live.id })
    )

    expect(read.status).toBe(404)
    expect(await codeOf(read)).toBe("RUN_NOT_FOUND")
    expect(engineCalls(comfy)).toEqual([])
  })

  it("checks the visitor's key with the engine, and refuses a key header no key can hold", async () => {
    const { visitor, comfy } = openPublic()
    const keyed = visitor({ [keyHeaders.engine]: "comfyui-visitor-key" })

    const checked = await keyed.call(gatewayRoutes.checkEngineKey.path, {
      method: "POST",
    })
    const bad = await visitor({ [keyHeaders.engine]: "two words" }).call(
      gatewayRoutes.getSettings.path
    )

    expect(await checked.json()).toEqual({
      checks: [
        {
          engine: "comfy-workflow",
          target: "comfy-cloud",
          origin: "live",
          check: "valid",
        },
        { engine: "demo", target: "demo", origin: "demo", check: "valid" },
      ],
    })
    expect(engineCalls(comfy).map((call) => call.authorization)).toEqual([
      "Bearer comfyui-visitor-key",
    ])
    expect(bad.status).toBe(400)
    expect(await codeOf(bad)).toBe("KEY_HEADER_INVALID")
  })

  it("limits the requests of one session per minute", async () => {
    const clock = new FixedClock({ now: start })
    const { visitor } = openPublic({
      settings: { SESSION_REQUESTS_PER_MINUTE: "3" },
      clock,
    })
    const busy = visitor()
    const calm = visitor()

    const answers = []
    for (let request = 0; request < 4; request += 1) {
      answers.push(await busy.call(gatewayRoutes.getHealth.path))
    }
    const other = await calm.call(gatewayRoutes.getHealth.path)
    clock.advance(60_000)
    const later = await busy.call(gatewayRoutes.getHealth.path)

    expect(answers.map((answer) => answer.status)).toEqual([200, 200, 200, 429])
    expect(await codeOf(answers[3] ?? fail())).toBe("SESSION_RATE_LIMITED")
    expect(answers[3]?.headers.get("retry-after")).toBe("60")
    expect(other.status).toBe(200)
    expect(later.status).toBe(200)
  })
})
