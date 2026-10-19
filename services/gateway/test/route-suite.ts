import { conversationRoutes } from "@rosesfield/agent"
import {
  appListResponse,
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
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"
import {
  engineSettingsResponse,
  gatewayRoutes,
  healthResponse,
  keyCheckResponse,
} from "#gateway.contract"
import { type Harness, harnessFor, jsonInit, type PortsFor } from "./harness"
import { pngBytes } from "./sample-apps"

const unknownId = "5d0c9b8a-7f6e-4d5c-8b4a-3f2e1d0c9b8a"

async function errorCodeOf(response: Response): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

type SuiteHooks = {
  reset?: () => Promise<void>
}

export function describeRoutes(
  name: string,
  portsFor: PortsFor,
  hooks: SuiteHooks = {}
): void {
  describe(`the gateway routes over ${name}`, () => {
    let gateway: Harness

    beforeEach(async () => {
      await hooks.reset?.()
    })

    afterEach(() => gateway.close())

    async function upload(): Promise<string> {
      const response = await gateway.call(routes.uploadAsset.path, {
        method: "POST",
        headers: { "content-type": "image/png" },
        body: pngBytes,
      })
      expect(response.status).toBe(201)
      return assetResponse.parse(await response.json()).asset.id
    }

    async function startImage(
      inputs: Record<string, unknown> = { prompt: "a red door in fog" },
      headers: Record<string, string> = {}
    ): Promise<Response> {
      const path = buildPath(routes.startRun.path, { appId: "sample-image" })
      return gateway.call(path, jsonInit({ inputs }, headers))
    }

    async function readRun(runId: string) {
      const path = buildPath(routes.getRun.path, { runId })
      const response = await gateway.call(path)
      expect(response.status).toBe(200)
      return runResponse.parse(await response.json()).run
    }

    it("lists the catalog apps without their engine bindings", async () => {
      gateway = harnessFor({ portsFor })
      const response = await gateway.call(routes.listApps.path)
      expect(response.status).toBe(200)
      const body: unknown = await response.json()
      const { apps } = appListResponse.parse(body)
      expect(apps.map((app) => app.id)).toEqual([
        "sample-image",
        "sample-audio",
      ])
      expect(JSON.stringify(body)).not.toContain("comfy-workflow")
    })

    it("starts a run on the demo engine, drives it to done and keeps its output in the library", async () => {
      gateway = harnessFor({ portsFor })
      const response = await startImage()
      expect(response.status).toBe(202)
      const { run } = runResponse.parse(await response.json())
      expect(run).toMatchObject({ status: "queued", origin: "demo" })
      expect(gateway.jobs.enqueued).toEqual([run.id])
      await gateway.drive(run.id)
      const done = await readRun(run.id)
      expect(done.status).toBe("done")
      expect(done.outputs).toHaveLength(1)
      const outputId = done.outputs[0] ?? ""
      const asset = await gateway.call(
        buildPath(routes.getAsset.path, { assetId: outputId })
      )
      expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
        kind: "image",
        mime: "image/png",
        sourceRunId: run.id,
        width: 1024,
        height: 1024,
      })
      const content = await gateway.call(
        buildPath(routes.readAssetContent.path, { assetId: outputId })
      )
      expect(content.status).toBe(200)
      expect(content.headers.get("content-type")).toBe("image/png")
      expect(content.headers.get("content-security-policy")).toContain(
        "sandbox"
      )
      const bytes = new Uint8Array(await content.arrayBuffer())
      expect([...bytes.slice(0, 8)]).toEqual([...pngBytes.slice(0, 8)])
    })

    it("hands a run its reference images and a character's images", async () => {
      gateway = harnessFor({ portsFor })
      const reference = await upload()
      const portrait = await upload()
      const created = await gateway.call(
        routes.createCharacter.path,
        jsonInit({ name: "Ada", references: [portrait], notes: "" })
      )
      const { character } = characterResponse.parse(await created.json())
      const response = await startImage({
        prompt: "a portrait by a window",
        references: [reference],
        character: [character.id],
      })
      const { run } = runResponse.parse(await response.json())
      await gateway.drive(run.id)
      expect((await readRun(run.id)).status).toBe("done")
    })

    it("refuses a JSON body past its limit before a run starts", async () => {
      gateway = harnessFor({ portsFor })
      const response = await startImage({ prompt: "a".repeat(1_100_000) })
      expect(response.status).toBe(400)
      expect(await errorCodeOf(response)).toBe("BODY_TOO_LARGE")
      expect(gateway.jobs.enqueued).toHaveLength(0)
    })

    it("answers a repeated idempotency key with the run it started", async () => {
      gateway = harnessFor({ portsFor })
      const key = { "idempotency-key": "first-try" }
      const first = runResponse.parse(
        await (await startImage(undefined, key)).json()
      )
      const second = runResponse.parse(
        await (await startImage(undefined, key)).json()
      )
      expect(second.run.id).toBe(first.run.id)
      expect(gateway.jobs.enqueued).toHaveLength(1)
    })

    it("refuses inputs that break the app's rules, an unknown app and a body that is not JSON", async () => {
      gateway = harnessFor({ portsFor })
      const missing = await startImage({})
      expect(missing.status).toBe(400)
      expect(await errorCodeOf(missing)).toBe("RUN_INPUT_INVALID")
      const unknown = await gateway.call(
        buildPath(routes.startRun.path, { appId: "no-such-app" }),
        jsonInit({ inputs: { prompt: "a door" } })
      )
      expect(unknown.status).toBe(404)
      expect(await errorCodeOf(unknown)).toBe("APP_NOT_FOUND")
      const text = await gateway.call(
        buildPath(routes.startRun.path, { appId: "sample-image" }),
        { method: "POST", body: JSON.stringify({ inputs: { prompt: "a" } }) }
      )
      expect(text.status).toBe(400)
      expect(await errorCodeOf(text)).toBe("REQUEST_INVALID")
      expect(gateway.jobs.enqueued).toHaveLength(0)
    })

    it("lists the history newest first, by app, and refuses a cursor it never gave", async () => {
      gateway = harnessFor({ portsFor })
      const first = runResponse.parse(await (await startImage()).json()).run
      gateway.clock.advance(1000)
      const second = runResponse.parse(await (await startImage()).json()).run
      await gateway.call(
        buildPath(routes.startRun.path, { appId: "sample-audio" }),
        jsonInit({ inputs: { script: "Hello" } })
      )
      const listed = await gateway.call(
        `${routes.listRuns.path}?appId=sample-image`
      )
      expect(listed.status).toBe(200)
      const page = runPageResponse.parse(await listed.json())
      expect(page.runs.map((run) => run.id)).toEqual([second.id, first.id])
      expect(page.next).toBeNull()
      const all = runPageResponse.parse(
        await (await gateway.call(routes.listRuns.path)).json()
      )
      expect(all.runs).toHaveLength(3)
      const bad = await gateway.call(`${routes.listRuns.path}?cursor=nope`)
      expect(bad.status).toBe(400)
      expect(await errorCodeOf(bad)).toBe("RUN_CURSOR_INVALID")
    })

    it("cancels a run that works and repeats a run with its inputs and seed", async () => {
      gateway = harnessFor({ portsFor })
      const { run } = runResponse.parse(
        await (await startImage({ prompt: "a boat", seed: 7 })).json()
      )
      const cancel = await gateway.call(
        buildPath(routes.cancelRun.path, { runId: run.id }),
        { method: "POST" }
      )
      expect(cancel.status).toBe(200)
      expect(runResponse.parse(await cancel.json()).run.status).toBe(
        "cancelled"
      )
      const repeat = await gateway.call(
        buildPath(routes.repeatRun.path, { runId: run.id }),
        { method: "POST" }
      )
      expect(repeat.status).toBe(202)
      const again = runResponse.parse(await repeat.json()).run
      expect(again.id).not.toBe(run.id)
      expect(again).toMatchObject({ status: "queued", seed: 7 })
      expect(again.inputs).toEqual(run.inputs)
      const missing = await gateway.call(
        buildPath(routes.getRun.path, { runId: unknownId })
      )
      expect(missing.status).toBe(404)
      expect(await errorCodeOf(missing)).toBe("RUN_NOT_FOUND")
    })

    it("uploads, lists, reads and deletes an asset, and refuses a type the library does not keep", async () => {
      gateway = harnessFor({ portsFor })
      const id = await upload()
      const listed = assetPageResponse.parse(
        await (
          await gateway.call(`${routes.listAssets.path}?kind=image`)
        ).json()
      )
      expect(listed.assets.map((asset) => asset.id)).toEqual([id])
      const other = assetPageResponse.parse(
        await (
          await gateway.call(`${routes.listAssets.path}?kind=video`)
        ).json()
      )
      expect(other.assets).toEqual([])
      const path = buildPath(routes.deleteAsset.path, { assetId: id })
      expect((await gateway.call(path, { method: "DELETE" })).status).toBe(204)
      const gone = await gateway.call(
        buildPath(routes.readAssetContent.path, { assetId: id })
      )
      expect(gone.status).toBe(404)
      expect(await errorCodeOf(gone)).toBe("ASSET_NOT_FOUND")
      const pdf = await gateway.call(routes.uploadAsset.path, {
        method: "POST",
        headers: { "content-type": "application/pdf" },
        body: pngBytes,
      })
      expect(pdf.status).toBe(400)
      expect(await errorCodeOf(pdf)).toBe("ASSET_KIND_UNSUPPORTED")
    })

    it("creates, lists, reads, changes and deletes a character", async () => {
      gateway = harnessFor({ portsFor })
      const portrait = await upload()
      const created = await gateway.call(
        routes.createCharacter.path,
        jsonInit({ name: "Ada", references: [portrait], notes: "red coat" })
      )
      expect(created.status).toBe(201)
      const { character } = characterResponse.parse(await created.json())
      const path = buildPath(routes.getCharacter.path, {
        characterId: character.id,
      })
      const changed = await gateway.call(path, {
        ...jsonInit({ name: "Ada Lane" }),
        method: "PATCH",
      })
      expect(changed.status).toBe(200)
      expect(characterResponse.parse(await changed.json()).character.name).toBe(
        "Ada Lane"
      )
      const listed = characterListResponse.parse(
        await (await gateway.call(routes.listCharacters.path)).json()
      )
      expect(listed.characters.map((one) => one.id)).toEqual([character.id])
      const inUse = await gateway.call(
        buildPath(routes.deleteAsset.path, { assetId: portrait }),
        { method: "DELETE" }
      )
      expect(inUse.status).toBe(409)
      expect(await errorCodeOf(inUse)).toBe("ASSET_IN_USE")
      expect((await gateway.call(path, { method: "DELETE" })).status).toBe(204)
      const gone = await gateway.call(path)
      expect(gone.status).toBe(404)
      expect(await errorCodeOf(gone)).toBe("CHARACTER_NOT_FOUND")
      const invalid = await gateway.call(
        routes.createCharacter.path,
        jsonInit({ name: "Ada" })
      )
      expect(invalid.status).toBe(400)
      expect(await errorCodeOf(invalid)).toBe("REQUEST_INVALID")
    })

    it("reports health, and answers an unknown API path with a not-found code", async () => {
      gateway = harnessFor({ portsFor })
      const health = await gateway.call(gatewayRoutes.getHealth.path)
      expect(healthResponse.parse(await health.json()).status).toBe("ok")
      const unknown = await gateway.call("/api/nothing-here")
      expect(unknown.status).toBe(404)
      expect(await errorCodeOf(unknown)).toBe("ROUTE_NOT_FOUND")
    })

    it("publishes each app's input schema and answers an unknown app with a not-found code", async () => {
      gateway = harnessFor({ portsFor })
      const response = await gateway.call(
        buildPath(gatewayRoutes.getAppSchema.path, { appId: "sample-image" })
      )
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toBe(
        "application/schema+json"
      )
      const schema = z
        .object({
          type: z.literal("object"),
          required: z.array(z.string()),
          properties: z.object({
            inputs: z.object({ properties: z.record(z.string(), z.unknown()) }),
          }),
        })
        .parse(await response.json())
      expect(schema.required).toEqual(["inputs"])
      expect(Object.keys(schema.properties.inputs.properties)).toEqual([
        "prompt",
        "references",
        "character",
        "seed",
      ])
      const unknown = await gateway.call(
        buildPath(gatewayRoutes.getAppSchema.path, { appId: "no-such-app" })
      )
      expect(unknown.status).toBe(404)
      expect(await errorCodeOf(unknown)).toBe("APP_NOT_FOUND")
    })

    it("reports the engine target, the targets it can reach, and checks the key of each engine", async () => {
      gateway = harnessFor({ portsFor })
      const engine = engineSettingsResponse.parse(
        await (await gateway.call(gatewayRoutes.getEngineSettings.path)).json()
      )
      const check = await gateway.call(gatewayRoutes.checkEngineKey.path, {
        method: "POST",
      })
      expect(engine.engine).toEqual({
        target: "demo",
        address: null,
        key: "missing",
        origin: "demo",
      })
      expect(engine.targets).toContainEqual({
        target: "runpod-serverless",
        settings: ["RUNPOD_ENDPOINT_ID", "RUNPOD_API_KEY"],
      })
      expect(engine.targets.map((one) => one.target)).toHaveLength(7)
      expect(keyCheckResponse.parse(await check.json())).toEqual({
        checks: [
          { engine: "demo", target: "demo", origin: "demo", check: "valid" },
        ],
      })
    })

    it("serves every route of the contract's route manifest", async () => {
      gateway = harnessFor({ portsFor })
      const manifests = [routes, gatewayRoutes, conversationRoutes]
      for (const route of manifests.flatMap((manifest) =>
        Object.values(manifest)
      )) {
        const path = route.path.replace(/:[a-zA-Z]+/g, unknownId)
        const response = await gateway.call(path, { method: route.method })
        const body: unknown = await response.json().catch(() => null)
        const parsed = errorEnvelope.safeParse(body)
        const code = parsed.success ? parsed.data.error.code : null
        expect(code, `${route.method} ${route.path}`).not.toBe(
          "ROUTE_NOT_FOUND"
        )
      }
    })
  })
}
