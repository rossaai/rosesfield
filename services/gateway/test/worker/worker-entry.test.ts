import {
  acceptedProposalResponse,
  answerEvent,
  conversationListResponse,
  conversationResponse,
  conversationRoutes,
  transcriptResponse,
} from "@rosesfield/agent"
import { listApps } from "@rosesfield/catalog"
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
import { toolCallStream } from "../../../../packages/agent/test/fixtures/openai-chat-stream"
import { ownerToken, pngBytes } from "../sample-apps"
import { serveModel } from "./fake-model"
import { gatewayRoot, testConfig } from "./platform-proxy"

const modelId = "qwen3.8:27b"
const app = promptOnlyApp()
const prompt = app.inputs.find((input) => input.type === "prompt")
const promptInputs = prompt === undefined ? {} : { [prompt.name]: "a red door" }

const model = await serveModel([
  toolCallStream(modelId, {
    id: "call_1",
    name: app.id,
    arguments: { inputs: promptInputs },
  }),
])

const worker = createTestHarness({
  root: gatewayRoot,
  workers: [
    {
      configPath: testConfig,
      secrets: {
        OWNER_TOKEN: ownerToken,
        AGENT_BASE_URL: model.baseUrl,
        AGENT_MODEL: modelId,
      },
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
  await model.close()
})

async function codeOf(response: {
  json: () => Promise<unknown>
}): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

function promptOnlyApp(): AppDefinition {
  const found = listApps().find((one) =>
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
        engine: {
          target: "demo",
          address: null,
          key: "missing",
          origin: "demo",
        },
        lock: "token",
        agent: {
          model: "set",
          models: [{ provider: "openai-compatible", id: modelId }],
        },
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

  it("answers through the agent's Durable Object, proposes a run, and starts it once you accept", async () => {
    const json = { ...withToken, "content-type": "application/json" }
    const started = await worker.fetch(
      conversationRoutes.startConversation.path,
      {
        method: "POST",
        headers: withToken,
      }
    )
    expect(started.status).toBe(201)
    const { conversation } = conversationResponse.parse(await started.json())
    const ids = { conversationId: conversation.id }
    const answer = await worker.fetch(
      buildPath(conversationRoutes.sendMessage.path, ids),
      {
        method: "POST",
        headers: json,
        body: JSON.stringify({ text: "A red door" }),
      }
    )
    const events = (await answer.text())
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => answerEvent.parse(JSON.parse(line.slice(6))))
    const proposed = events.find((event) => event.type === "proposal")
    if (proposed?.type !== "proposal") {
      throw new Error(`The agent proposed no run: ${JSON.stringify(events)}`)
    }
    const accepted = await worker.fetch(
      buildPath(conversationRoutes.acceptProposal.path, {
        ...ids,
        proposalId: proposed.proposal.id,
      }),
      { method: "POST", headers: withToken }
    )
    expect(accepted.status).toBe(202)
    const { run } = acceptedProposalResponse.parse(await accepted.json())
    const listed = conversationListResponse.parse(
      await (
        await worker.fetch(conversationRoutes.listConversations.path, {
          headers: withToken,
        })
      ).json()
    )
    const read = transcriptResponse.parse(
      await (
        await worker.fetch(
          buildPath(conversationRoutes.readConversation.path, ids),
          {
            headers: withToken,
          }
        )
      ).json()
    )

    expect(events.at(-1)).toEqual({ type: "done" })
    expect(listed.conversations.map((one) => one.id)).toContain(conversation.id)
    expect(read.items).toContainEqual({ type: "person", text: "A red door" })
    expect(read.items).toContainEqual({
      type: "proposal",
      proposal: { ...proposed.proposal, status: "accepted", runId: run.id },
    })
    expect(model.authorizations).toEqual(["Bearer none"])
    expect(await runToDone(run.id)).toBe("done")
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
