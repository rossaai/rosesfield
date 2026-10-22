import { conversationRoutes } from "@rosesfield/agent"
import { listApps } from "@rosesfield/catalog"
import {
  appTasksOf,
  defaultModelOf,
  isHostedModelId,
} from "@rosesfield/catalog/comfy"
import {
  type AppDefinition,
  appListResponse,
  assetResponse,
  buildPath,
  characterResponse,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestHarness } from "wrangler"
import { gatewayRoutes } from "#gateway.contract"
import { ownerToken, pngBytes } from "../sample-apps"
import { gatewayRoot, testConfig } from "./platform-proxy"

const app = promptOnlyApp()
const prompt = app.inputs.find((input) => input.type === "prompt")
const promptInputs = prompt === undefined ? {} : { [prompt.name]: "a red door" }

const worker = createTestHarness({
  root: gatewayRoot,
  workers: [
    {
      configPath: testConfig,
      secrets: { OWNER_TOKEN: ownerToken },
    },
  ],
})

const withToken = { authorization: `Bearer ${ownerToken}` }

beforeAll(async () => {
  await worker.listen()
  await worker.getWorker().applyD1Migrations("DB")
})

afterAll(async () => {
  await worker.close()
})

async function codeOf(response: {
  json: () => Promise<unknown>
}): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

function promptOnlyApp(): AppDefinition {
  const found = listApps().find(
    (one) =>
      (appTasksOf(one).length === 0 ||
        !isHostedModelId(defaultModelOf(one) ?? "")) &&
      one.inputs.every((input) =>
        input.type === "prompt" ||
        input.type === "choice" ||
        input.type === "number" ||
        input.type === "toggle" ||
        input.type === "seed"
          ? true
          : input.presence === "optional"
      )
  )
  if (found === undefined) {
    throw new Error("The catalog holds no app that runs on a prompt alone")
  }
  return found
}

async function runToDone(runId: string): Promise<string> {
  const path = buildPath(routes.getRun.path, { runId })
  let status = "queued"
  for (let poll = 0; poll < 40 && status !== "done"; poll += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const read = await worker.fetch(path, { headers: withToken })
    status = runResponse.parse(await read.json()).run.status
  }
  return status
}

describe("the Workers entry in workerd", () => {
  it("refuses an API request and an MCP request without the owner token", async () => {
    for (const { path, method } of [
      { path: routes.listApps.path, method: "GET" },
      { path: "/mcp", method: "POST" },
    ]) {
      const response = await worker.fetch(path, { method })
      expect(response.status, path).toBe(401)
      expect(await codeOf(response)).toBe("OWNER_TOKEN_MISSING")
    }
  })

  it("reports its settings and lists the catalog with the token", async () => {
    const settings = await worker.fetch(gatewayRoutes.getSettings.path, {
      headers: withToken,
    })
    expect(await settings.json()).toEqual({
      settings: {
        mode: "owner",
        place: "workers",
        engine: {
          target: "demo",
          address: null,
          key: "missing",
          origin: "demo",
        },
        lock: "token",
        keyFrom: "server",
        agent: { model: "missing", models: [] },
      },
    })
    const apps = await worker.fetch(routes.listApps.path, {
      headers: withToken,
    })
    const listed = appListResponse.parse(await apps.json()).apps
    expect(listed.map((app) => app.id)).toEqual(listApps().map((app) => app.id))
  })

  it("keeps an upload in R2 and D1 and serves its bytes", async () => {
    const uploaded = await worker.fetch(routes.uploadAsset.path, {
      method: "POST",
      headers: { ...withToken, "content-type": "image/png" },
      body: pngBytes,
    })
    expect(uploaded.status).toBe(201)
    const { asset } = assetResponse.parse(await uploaded.json())
    const content = await worker.fetch(
      buildPath(routes.readAssetContent.path, { assetId: asset.id }),
      { headers: withToken }
    )
    expect(content.headers.get("content-type")).toBe("image/png")
    expect(new Uint8Array(await content.arrayBuffer())).toEqual(pngBytes)
    const created = await worker.fetch(routes.createCharacter.path, {
      method: "POST",
      headers: { ...withToken, "content-type": "application/json" },
      body: JSON.stringify({ name: "Ada", references: [asset.id], notes: "" }),
    })
    expect(created.status).toBe(201)
    expect(characterResponse.parse(await created.json()).character.name).toBe(
      "Ada"
    )
  })

  it("answers the MCP handshake", async () => {
    const response = await worker.fetch("/mcp", {
      method: "POST",
      headers: {
        ...withToken,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('"name":"rosesfield"')
  })

  it("drives a run to done through the run watcher's Durable Object alarm", async () => {
    const started = await worker.fetch(
      buildPath(routes.startRun.path, { appId: app.id }),
      {
        method: "POST",
        headers: { ...withToken, "content-type": "application/json" },
        body: JSON.stringify({ inputs: promptInputs }),
      }
    )
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(await runToDone(run.id)).toBe("done")
  })

  it("keeps the agent off through its Durable Object when the server holds no Comfy key", async () => {
    const started = await worker.fetch(
      conversationRoutes.startConversation.path,
      { method: "POST", headers: withToken }
    )

    expect(started.status).toBe(412)
    expect(await codeOf(started)).toBe("AGENT_MODEL_MISSING")
  })
})

describe("the Workers entry without an owner token", () => {
  const open = createTestHarness({
    root: gatewayRoot,
    workers: [{ configPath: testConfig }],
  })

  beforeAll(() => open.listen())
  afterAll(() => open.close())

  it("refuses every request and names the missing setting in its log", async () => {
    const response = await open.fetch(gatewayRoutes.getHealth.path)
    expect(response.status).toBe(412)
    expect(await codeOf(response)).toBe("ENV_INVALID")
    const logged = open.getLogs().map((log) => JSON.stringify(log))
    expect(logged.join("\n")).toContain("OWNER_TOKEN is missing")
  })
})

describe("the Workers entry with a removed agent setting", () => {
  const removed = createTestHarness({
    root: gatewayRoot,
    workers: [
      {
        configPath: testConfig,
        secrets: { OWNER_TOKEN: ownerToken, AGENT_MODEL: "qwen3.8:27b" },
      },
    ],
  })

  beforeAll(() => removed.listen())
  afterAll(() => removed.close())

  it("refuses every request and names the setting it no longer reads", async () => {
    const response = await removed.fetch(gatewayRoutes.getHealth.path, {
      headers: withToken,
    })
    expect(response.status).toBe(412)
    expect(await codeOf(response)).toBe("ENV_INVALID")
    const logged = removed.getLogs().map((log) => JSON.stringify(log))
    expect(logged.join("\n")).toContain("AGENT_MODEL is set")
  })
})
