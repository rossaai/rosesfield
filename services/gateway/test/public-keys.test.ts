import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  acceptedProposalResponse,
  answerEvent,
  conversationResponse,
  conversationRoutes,
} from "@rosesfield/agent"
import {
  accountRoutes,
  buildPath,
  routes,
  runResponse,
  shareResponse,
  shareRoutes,
} from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { readServerEnv } from "#env"
import { gatewayRoutes } from "#gateway.contract"
import { keyHeaders } from "#session/visitor-keys"
import {
  type FakeEndpoint,
  serveChatStreams,
  textStream,
  toolCallStream,
} from "../../../packages/agent/test/fixtures/openai-chat-stream"
import { fakeComfy } from "./fixtures/comfy-fetch"
import { captureLogs, filesHolding, seenHolding } from "./fixtures/leak-scan"
import { pageHtml } from "./fixtures/public-gateway"
import { type Seen, Visitor } from "./fixtures/visitor"
import { imageApp, sessionSecret, start } from "./sample-apps"

const engineKey = "comfyui-SENTINEL-engine-4f2a9c7d"
const refusedKey = "comfyui-SENTINEL-refused-0b9e"
const agentKey = "sk-SENTINEL-agent-8d1e7b3a"
const modelId = "qwen3.8:27b"

const folders: string[] = []
let gateway: LocalGateway | null = null
let endpoint: FakeEndpoint | null = null

afterEach(async () => {
  await gateway?.close()
  await endpoint?.close()
  gateway = null
  endpoint = null
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function folder(): string {
  const made = mkdtempSync(join(tmpdir(), "rosesfield-keys-"))
  folders.push(made)
  return made
}

function platformFolder(): string {
  const made = folder()
  writeFileSync(join(made, "index.html"), pageHtml)
  return made
}

function json(body: unknown) {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }
}

async function driveVisitor(visitor: Visitor, refused: Visitor): Promise<void> {
  const conversation = conversationResponse.parse(
    await (
      await visitor.call(conversationRoutes.startConversation.path, json({}))
    ).json()
  ).conversation
  const ids = { conversationId: conversation.id }
  const answer = await visitor.call(
    buildPath(conversationRoutes.sendMessage.path, ids),
    json({ text: "Make a red door" })
  )
  const proposalEvent = (await answer.text())
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => answerEvent.parse(JSON.parse(line.slice(6))))
    .find((event) => event.type === "proposal")
  if (proposalEvent?.type !== "proposal") {
    throw new Error("The agent proposed no run")
  }
  const accepted = acceptedProposalResponse.parse(
    await (
      await visitor.call(
        buildPath(conversationRoutes.acceptProposal.path, {
          ...ids,
          proposalId: proposalEvent.proposal.id,
        }),
        { method: "POST" }
      )
    ).json()
  )
  const runPath = buildPath(routes.getRun.path, { runId: accepted.run.id })
  await visitor.call(runPath)
  const done = runResponse.parse(await (await visitor.call(runPath)).json())
  expect(done.run.status).toBe("done")
  const shared = await visitor.call(
    buildPath(shareRoutes.shareRun.path, { runId: done.run.id }),
    { method: "POST" }
  )
  expect(shared.status).toBe(201)
  const { share } = shareResponse.parse(await shared.json())
  await visitor.withoutKeys().call(share.path)
  await visitor.withoutKeys().call(`${share.path}/media/0`)
  await visitor.call(accountRoutes.getAccount.path)
  await visitor.call(
    buildPath(conversationRoutes.sendMessage.path, ids),
    json({ text: "Thanks" })
  )
  await visitor.call(gatewayRoutes.checkEngineKey.path, { method: "POST" })
  await visitor.call(gatewayRoutes.getSettings.path)
  await visitor.call(conversationRoutes.listConversations.path)
  await visitor.call(buildPath(conversationRoutes.readConversation.path, ids))
  const failed = runResponse.parse(
    await (
      await refused.call(
        buildPath(routes.startRun.path, { appId: "sample-image" }),
        json({ inputs: { prompt: "a blue door" } })
      )
    ).json()
  )
  const read = runResponse.parse(
    await (
      await refused.call(
        buildPath(routes.getRun.path, { runId: failed.run.id })
      )
    ).json()
  )
  expect(read.run.failure?.code).toBe("ENGINE_KEY_INVALID")
  await refused.call(gatewayRoutes.checkEngineKey.path, { method: "POST" })
  await refused.call(accountRoutes.getAccount.path)
}

describe("a visitor's keys in public mode", () => {
  it("reach the engine and the agent's model for the request alone, and never a file, a log or a response", async () => {
    endpoint = serveChatStreams([
      toolCallStream(modelId, {
        id: "call_1",
        name: "sample-image",
        arguments: { inputs: { prompt: "a red door" } },
      }),
      textStream(modelId, "Glad it worked."),
    ])
    const dataDir = folder()
    const comfy = fakeComfy()
    gateway = composeLocalGateway({
      env: readServerEnv({
        MODE: "public",
        HOST: "0.0.0.0",
        SESSION_SECRET: sessionSecret,
        DATA_DIR: dataDir,
        AGENT_BASE_URL: endpoint.baseUrl,
        AGENT_MODEL: modelId,
      }),
      apps: [imageApp()],
      clock: new FixedClock({ now: start }),
      platformRoot: platformFolder(),
      fetch: comfy.fetch,
    })
    const seen: Seen[] = []
    const visitor = new Visitor({
      app: gateway.app,
      keys: { [keyHeaders.engine]: engineKey, [keyHeaders.agent]: agentKey },
      seen,
    })
    const refused = new Visitor({
      app: gateway.app,
      keys: { [keyHeaders.engine]: refusedKey },
      seen,
    })
    const logs = captureLogs()

    try {
      await driveVisitor(visitor, refused)
      await gateway.close()
    } finally {
      logs.restore()
    }
    gateway = null

    expect(
      comfy.calls.filter((call) => call.authorization === `Bearer ${engineKey}`)
    ).not.toHaveLength(0)
    expect(endpoint.requests.map((request) => request.authorization)).toEqual([
      `Bearer ${agentKey}`,
      `Bearer ${agentKey}`,
    ])
    for (const secret of [engineKey, refusedKey, agentKey]) {
      expect(filesHolding(dataDir, secret)).toEqual([])
      expect(logs.lines.filter((line) => line.includes(secret))).toEqual([])
      expect(seenHolding(seen, secret)).toEqual([])
    }
  })

  it("control: the scan finds a key that a file, a log line or a response holds", () => {
    const dataDir = folder()
    writeFileSync(join(dataDir, "leaked.db"), `row ${engineKey} row`)
    const seen: Seen[] = [
      { status: 200, headers: "[]", body: `{"key":"${agentKey}"}` },
    ]
    const logs = captureLogs()
    try {
      console.error(new Error("failed", { cause: { key: refusedKey } }))
    } finally {
      logs.restore()
    }

    expect(filesHolding(dataDir, engineKey)).toEqual([
      join(dataDir, "leaked.db"),
    ])
    expect(seenHolding(seen, agentKey)).toHaveLength(1)
    expect(logs.lines.join("\n")).toContain(refusedKey)
  })
})
