import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listApps, readApps } from "@rosesfield/catalog"
import { effectRecipes, effectsApp } from "@rosesfield/catalog/effects"
import { isRemakeOpen } from "@rosesfield/catalog/remake"
import {
  type AppDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  type InputDefinition,
  routes,
  runPageResponse,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { servedApps } from "#catalog/served-apps"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { readServerEnv, readWorkerEnv, type WorkerVars } from "#env"
import { gatewayRoutes, settingsResponse } from "#gateway.contract"
import { passedRecipe } from "../../../../packages/catalog/test/effects/passed-recipe"
import { pngOf } from "../fixtures/effects-gateway"
import { Visitor } from "../fixtures/visitor"
import { ownerToken, sessionSecret, start } from "../sample-apps"

const host = { host: "127.0.0.1:8787" }
const draft = "melt-away"
const folders: string[] = []
const clock = new FixedClock({ now: start })
let open: LocalGateway | null = null

afterEach(async () => {
  open?.jobs.stop()
  await open?.close()
  open = null
  for (const made of folders.splice(0)) {
    rmSync(made, { recursive: true, force: true })
  }
})

function folder(): string {
  const made = mkdtempSync(join(tmpdir(), "rosesfield-drafts-"))
  folders.push(made)
  return made
}

function effectsOf(apps: readonly AppDefinition[]): AppDefinition {
  const found = apps.find((app) => app.id === "effects")
  if (found === undefined) {
    throw new Error("The served apps hold no effects app")
  }
  return found
}

function optionsOf(app: AppDefinition): string[] {
  const input = app.inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === "effect" && one.type === "choice"
  )
  return input === undefined ? [] : input.options.map((one) => one.value)
}

function onePassed(): AppDefinition[] {
  return readApps([
    { folder: "effects", app: effectsApp([passedRecipe("push-into-eye")]) },
  ])
}

const localVars = (): WorkerVars =>
  readServerEnv({ HOST: "127.0.0.1", DATA_DIR: folder() })

const tokenVars = (): WorkerVars =>
  readServerEnv({ HOST: "0.0.0.0", OWNER_TOKEN: ownerToken })

const publicVars = (): WorkerVars =>
  readServerEnv({
    MODE: "public",
    HOST: "0.0.0.0",
    SESSION_SECRET: sessionSecret,
  })

const judgeVars = (): WorkerVars => readWorkerEnv({ OWNER_TOKEN: ownerToken })

describe("the apps a server serves", () => {
  it("offers every effect, drafts after the passed ones, on a server that answers only on this computer", () => {
    const served = effectsOf(servedApps(localVars(), "bun", onePassed()))
    expect(served.closedKey).toBeNull()
    expect(optionsOf(served)).toEqual(effectRecipes.map((one) => one.effect))
    expect(optionsOf(served)).toContain(draft)
  })

  it.each([
    ["an owner token", tokenVars],
    ["public mode", publicVars],
    ["the judge deployment", judgeVars],
  ])("offers only the passed effects behind %s", (_, varsOf) => {
    const apps = onePassed()
    expect(servedApps(varsOf(), "bun", apps)).toBe(apps)
    expect(optionsOf(effectsOf(servedApps(varsOf(), "bun", apps)))).toEqual([
      "push-into-eye",
    ])
    expect(effectsOf(servedApps(varsOf(), "bun")).closedKey).toBe(
      "effects.closed"
    )
  })

  it("keeps every other app as the catalog lists it", () => {
    const served = servedApps(localVars(), "bun")
    const listed = listApps()
    expect(served.map((app) => app.id)).toEqual(listed.map((app) => app.id))
    for (const app of served.filter((one) => one.id !== "effects")) {
      expect(app).toBe(listed.find((one) => one.id === app.id))
    }
  })
})

describe("where Remake runs", () => {
  function remakeOf(apps: readonly AppDefinition[]): AppDefinition | undefined {
    return apps.find((app) => app.id === "remake")
  }

  it.each([
    ["on this computer", localVars],
    ["behind an owner token", tokenVars],
  ])("opens Remake on a server on bun %s, which runs ffmpeg", (_, varsOf) => {
    expect(remakeOf(servedApps(varsOf(), "bun"))?.closedKey).toBeNull()
  })

  it.each([
    ["on Workers", judgeVars, "workers"],
    ["in public mode", publicVars, "bun"],
  ] as const)("lists Remake closed %s", (_, varsOf, place) => {
    const remake = remakeOf(servedApps(varsOf(), place))
    expect(remake?.closedKey).toBe("remake.closed")
    expect(remake?.inputs).toEqual(remakeOf(listApps())?.inputs)
  })

  it("serves its place on the settings, which open Remake exactly where the list does", async () => {
    const env = readServerEnv({ HOST: "127.0.0.1", DATA_DIR: folder() })
    open = composeLocalGateway({
      env,
      apps: servedApps(env, "bun"),
      clock,
      platformRoot: null,
    })
    const response = await open.app.request(gatewayRoutes.getSettings.path, {
      headers: host,
    })
    const { settings } = settingsResponse.parse(await response.json())
    expect(settings).toMatchObject({ mode: "owner", place: "bun" })
    expect(isRemakeOpen(settings)).toBe(true)
    expect(remakeOf(servedApps(env, settings.place))?.closedKey).toBeNull()
    expect(isRemakeOpen({ mode: "owner", place: "workers" })).toBe(false)
    expect(isRemakeOpen({ mode: "public", place: "bun" })).toBe(false)
  })

  it("control: a Workers server with no Remake in its list returns the list as it is", () => {
    const apps = onePassed()
    expect(servedApps(judgeVars(), "workers", apps)).toBe(apps)
  })
})

type StartInit = {
  method: string
  headers: Record<string, string>
  body: string
}

type Send = (path: string, init: StartInit) => Response | Promise<Response>

describe("a draft effect run", () => {
  function local(): LocalGateway {
    const env = readServerEnv({ HOST: "127.0.0.1", DATA_DIR: folder() })
    open = composeLocalGateway({
      env,
      apps: servedApps(env, "bun"),
      clock,
      platformRoot: null,
    })
    return open
  }

  function call(gateway: LocalGateway, path: string, init: RequestInit = {}) {
    return gateway.app.request(path, {
      ...init,
      headers: { ...host, ...init.headers },
    })
  }

  async function upload(gateway: LocalGateway): Promise<string> {
    const answer = await call(gateway, routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: pngOf(1080, 1920),
    })
    expect(answer.status).toBe(201)
    return assetResponse.parse(await answer.json()).asset.id
  }

  async function startDraft(send: Send, photo: string): Promise<Response> {
    return await send(buildPath(routes.startRun.path, { appId: "effects" }), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        inputs: { effect: draft, image: [photo] },
        aspectRatio: "9:16",
      }),
    })
  }

  async function finish(gateway: LocalGateway, runId: string): Promise<void> {
    gateway.jobs.stop()
    for (let step = 0; step < 20; step += 1) {
      const { nextWakeMs } = await gateway.handlers.advanceRun.execute({
        runId: runIdFormat.parse(runId),
      })
      if (nextWakeMs === null) {
        return
      }
      clock.advance(nextWakeMs)
    }
    throw new Error(`Run ${runId} did not end in 20 steps`)
  }

  it("starts on a local server and lands in the library and History", async () => {
    const gateway = local()
    const settings = await call(gateway, gatewayRoutes.getSettings.path)
    expect(
      settingsResponse.parse(await settings.json()).settings
    ).toMatchObject({ mode: "owner", lock: "local" })
    const photo = await upload(gateway)
    const started = await startDraft(
      (path, init) => call(gateway, path, init),
      photo
    )
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    await finish(gateway, run.id)
    const history = await call(gateway, routes.listRuns.path)
    const { runs } = runPageResponse.parse(await history.json())
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({
      id: run.id,
      appId: "effects",
      status: "done",
      inputs: { effect: draft },
      seed: run.seed,
    })
    const asset = await call(
      gateway,
      buildPath(routes.getAsset.path, { assetId: runs[0]?.outputs[0] ?? "" })
    )
    expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
      kind: "video",
      sourceRunId: run.id,
    })
  })

  it("is refused behind an owner token, and starts nothing", async () => {
    const env = readServerEnv({
      HOST: "0.0.0.0",
      OWNER_TOKEN: ownerToken,
      DATA_DIR: folder(),
    })
    open = composeLocalGateway({
      env,
      apps: servedApps(env, "bun"),
      platformRoot: null,
    })
    const gateway = open
    const send: Send = (path, init) =>
      call(gateway, path, {
        ...init,
        headers: { ...init.headers, authorization: `Bearer ${ownerToken}` },
      })
    const refused = await startDraft(send, crypto.randomUUID())
    expect(refused.status).toBe(409)
    expect(errorEnvelope.parse(await refused.json()).error.code).toBe(
      "APP_CLOSED"
    )
    const history = await call(gateway, routes.listRuns.path, {
      headers: { authorization: `Bearer ${ownerToken}` },
    })
    expect(runPageResponse.parse(await history.json()).runs).toEqual([])
  })

  it("is refused in public mode with its reason, and starts nothing", async () => {
    const env = readServerEnv({
      MODE: "public",
      HOST: "0.0.0.0",
      SESSION_SECRET: sessionSecret,
      DATA_DIR: folder(),
    })
    open = composeLocalGateway({
      env,
      apps: servedApps(env, "bun", onePassed()),
      platformRoot: null,
    })
    const visitor = new Visitor({ app: open.app, seen: [] })
    const send: Send = (path, init) => visitor.call(path, init)
    await visitor.call(routes.listApps.path)
    const refused = await startDraft(send, crypto.randomUUID())
    expect(refused.status).toBe(400)
    expect(errorEnvelope.parse(await refused.json()).error.code).toBe(
      "RUN_INPUT_INVALID"
    )
    const history = await visitor.call(routes.listRuns.path)
    expect(runPageResponse.parse(await history.json()).runs).toEqual([])
  })
})
