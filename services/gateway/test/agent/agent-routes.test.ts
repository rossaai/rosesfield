import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  type AgentHarness,
  type AnswerEvent,
  acceptedProposalResponse,
  answerEvent,
  type Conversation,
  conversationIdFormat,
  conversationListResponse,
  conversationResponse,
  conversationRoutes,
  type Proposal,
  proposalIdFormat,
  proposalResponse,
  routerAgentModel,
  routerChat,
  transcriptResponse,
} from "@rosesfield/agent"
import { buildPath, errorEnvelope } from "@rosesfield/contract"
import { appIdFormat, FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { agentFileName, localAgent } from "#agent/local-agent"
import { buildHandlers } from "#build-handlers"
import type { OwnerLock } from "#env"
import type { GatewayApp } from "#gateway-env"
import { FakeAgentHarness } from "../../../../packages/agent/test/fake/fake-agent-harness"
import { FakeJobRunner } from "../fake/fake-job-runner"
import { jsonInit, localHost, ownerGateway } from "../harness"
import { localPorts } from "../local-ports"
import { ownerToken, start } from "../sample-apps"

const conversation: Conversation = {
  id: conversationIdFormat.parse("5d0c7a3e-9b1f-4e2a-8c6d-3f4a5b6c7d8e"),
  title: null,
  runApproval: "ask",
  createdAt: "2026-10-17T09:00:00.000Z",
}

const proposal: Proposal = {
  id: proposalIdFormat.parse("3a4b5c6d-7e8f-4a1b-8c2d-3e4f5a6b7c8d"),
  appId: appIdFormat.parse("sample-image"),
  request: { inputs: { prompt: "a rose" }, count: 1, aspectRatio: "1:1" },
  status: "proposed",
  runIds: [],
  credits: null,
}

const routes = conversationRoutes
const startPath = routes.startConversation.path
const itemPath = buildPath(routes.readConversation.path, {
  conversationId: conversation.id,
})
const messagesPath = buildPath(routes.sendMessage.path, {
  conversationId: conversation.id,
})
const proposalParams = {
  conversationId: conversation.id,
  proposalId: proposal.id,
}

const answer: AnswerEvent[] = [
  { type: "message", index: 0, text: "Starting" },
  {
    type: "run",
    runId: runIdFormat.parse("1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f"),
  },
  { type: "proposal", proposal },
  { type: "done" },
]

const folders: string[] = []

afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function folder(): string {
  const made = mkdtempSync(join(tmpdir(), "rosesfield-gateway-agent-"))
  folders.push(made)
  return made
}

type Rig = {
  app: GatewayApp
  jobs: FakeJobRunner
}

function gatewayFor(
  agent: AgentHarness | null,
  lock: OwnerLock = { mode: "local" }
): Rig {
  const clock = new FixedClock({ now: start })
  const ports = localPorts(clock, folder())
  const jobs = new FakeJobRunner()
  const { handlers } = buildHandlers(ports, () => jobs)
  return { app: ownerGateway(handlers, ports.apps, lock, clock, agent), jobs }
}

function call(app: GatewayApp, path: string, init: RequestInit = {}) {
  return app.request(path, {
    ...init,
    headers: { ...localHost, ...(init.headers ?? {}) },
  })
}

async function codeOf(response: Response): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

function eventsOf(body: string): { name: string; event: AnswerEvent }[] {
  return body
    .split("\n\n")
    .filter((block) => block.trim() !== "")
    .map((block) => {
      const lines = block.split("\n")
      const name = lines.find((line) => line.startsWith("event: "))
      const data = lines.find((line) => line.startsWith("data: "))
      return {
        name: name?.slice("event: ".length) ?? "",
        event: answerEvent.parse(
          JSON.parse(data?.slice("data: ".length) ?? "")
        ),
      }
    })
}

async function startedAgent(): Promise<FakeAgentHarness> {
  const agent = new FakeAgentHarness(conversation, answer)
  await agent.startConversation({ runApproval: "ask" })
  return agent
}

describe("the agent routes", () => {
  it("start a conversation on auto, or one that asks before each run", async () => {
    const { app } = gatewayFor(new FakeAgentHarness(conversation, answer))

    const unsaid = await call(app, startPath, { method: "POST" })
    const asking = await call(app, startPath, jsonInit({ runApproval: "ask" }))

    expect(unsaid.status).toBe(201)
    expect(conversationResponse.parse(await unsaid.json())).toEqual({
      conversation: { ...conversation, runApproval: "auto" },
    })
    expect(
      conversationResponse.parse(await asking.json()).conversation.runApproval
    ).toBe("ask")
  })

  it("start a conversation on the effort the composer shows, change it, and refuse an effort no model offers", async () => {
    const { app } = gatewayFor(new FakeAgentHarness(conversation, answer))

    const started = await call(
      app,
      startPath,
      jsonInit({ runApproval: "ask", effort: "low" })
    )
    const changed = await call(app, itemPath, {
      ...jsonInit({ effort: "high" }),
      method: "PATCH",
    })
    const refused = await call(app, itemPath, {
      ...jsonInit({ effort: "huge" }),
      method: "PATCH",
    })

    expect(
      conversationResponse.parse(await started.json()).conversation.effort
    ).toBe("low")
    expect(
      conversationResponse.parse(await changed.json()).conversation
    ).toMatchObject({ runApproval: "ask", effort: "high" })
    expect(refused.status).toBe(400)
  })

  it("list, read, rename and delete a conversation", async () => {
    const agent = await startedAgent()
    const { app } = gatewayFor(agent)

    const listed = await call(app, routes.listConversations.path)
    const read = await call(app, itemPath)
    const renamed = await call(app, itemPath, {
      ...jsonInit({ title: "Roses", runApproval: "auto" }),
      method: "PATCH",
    })
    const empty = await call(app, itemPath, {
      ...jsonInit({}),
      method: "PATCH",
    })
    const deleted = await call(app, itemPath, { method: "DELETE" })
    const gone = await call(app, itemPath)

    expect(conversationListResponse.parse(await listed.json())).toEqual({
      conversations: [conversation],
    })
    expect(transcriptResponse.parse(await read.json())).toEqual({
      conversation,
      items: [],
    })
    expect(conversationResponse.parse(await renamed.json())).toEqual({
      conversation: { ...conversation, title: "Roses", runApproval: "auto" },
    })
    expect(empty.status).toBe(400)
    expect(deleted.status).toBe(204)
    expect(gone.status).toBe(404)
    expect(await codeOf(gone)).toBe("CONVERSATION_NOT_FOUND")
  })

  it("stream the answer to a message as server-sent events, one per change", async () => {
    const agent = await startedAgent()
    const { app } = gatewayFor(agent)

    const response = await call(app, messagesPath, jsonInit({ text: "Hi" }))

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    const events = eventsOf(await response.text())
    expect(events.map(({ event }) => event)).toEqual(answer)
    expect(events.map(({ name }) => name)).toEqual(
      answer.map((event) => event.type)
    )
    expect(agent.sent).toEqual([
      { conversationId: conversation.id, text: "Hi" },
    ])
  })

  it("refuse a message with no text before the agent sees it", async () => {
    const agent = await startedAgent()
    const { app } = gatewayFor(agent)

    const blank = await call(app, messagesPath, jsonInit({ text: "  " }))
    const extra = await call(
      app,
      messagesPath,
      jsonInit({ text: "Hi", model: "other" })
    )

    expect(blank.status).toBe(400)
    expect(await codeOf(blank)).toBe("REQUEST_INVALID")
    expect(await codeOf(extra)).toBe("REQUEST_INVALID")
    expect(agent.sent).toEqual([])
  })

  it("answer a malformed conversation id with 400 and an unknown one with 404", async () => {
    const { app } = gatewayFor(await startedAgent())

    const malformed = await call(
      app,
      buildPath(routes.readConversation.path, { conversationId: "x" })
    )
    const unknown = await call(
      app,
      buildPath(routes.readConversation.path, {
        conversationId: "6e1d8b4f-0c2a-4f3b-9d7e-4a5b6c7d8e9f",
      })
    )

    expect(malformed.status).toBe(400)
    expect(await codeOf(malformed)).toBe("INVALID_ID")
    expect(unknown.status).toBe(404)
    expect(await codeOf(unknown)).toBe("CONVERSATION_NOT_FOUND")
  })

  it("start the proposed run on accept, and leave a skipped one without a run", async () => {
    const agent = await startedAgent()
    agent.proposals.set(proposal.id, {
      proposal,
      body: { inputs: { prompt: "a rose" } },
    })
    const { app, jobs } = gatewayFor(agent)

    const accepted = await call(
      app,
      buildPath(routes.acceptProposal.path, proposalParams),
      { method: "POST" }
    )
    const skipped = await call(
      app,
      buildPath(routes.skipProposal.path, proposalParams),
      { method: "POST" }
    )

    expect(accepted.status).toBe(202)
    const { runs } = acceptedProposalResponse.parse(await accepted.json())
    expect(runs).toHaveLength(1)
    expect(runs[0]?.inputs).toMatchObject({ prompt: "a rose" })
    expect(jobs.enqueued).toEqual(runs.map((run) => run.id))
    expect(skipped.status).toBe(409)
    expect(await codeOf(skipped)).toBe("PROPOSAL_SETTLED")
    agent.proposals.set(proposal.id, { proposal, body: {} })
    const skippedFresh = await call(
      app,
      buildPath(routes.skipProposal.path, proposalParams),
      { method: "POST" }
    )
    expect(
      proposalResponse.parse(await skippedFresh.json()).proposal.status
    ).toBe("skipped")
  })
})

describe("the agent in the gateway", () => {
  it("answers that a model is needed when the server has no agent model", async () => {
    const { app } = gatewayFor(null)

    const started = await call(app, startPath, { method: "POST" })
    const listed = await call(app, routes.listConversations.path)
    const sent = await call(app, messagesPath, jsonInit({ text: "Hi" }))

    for (const response of [started, listed, sent]) {
      expect(response.status).toBe(412)
      expect(await codeOf(response)).toBe("AGENT_MODEL_MISSING")
    }
  })

  it("keeps the agent routes behind the owner lock", async () => {
    const lock: OwnerLock = { mode: "token", token: ownerToken }
    const { app } = gatewayFor(null, lock)

    const refused = await app.request(startPath, { method: "POST" })
    const allowed = await app.request(startPath, {
      method: "POST",
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(refused.status).toBe(401)
    expect(await codeOf(refused)).toBe("OWNER_TOKEN_MISSING")
    expect(await codeOf(allowed)).toBe("AGENT_MODEL_MISSING")
  })

  it("opens the agent's SQLite file in the data folder for a Router chat model", async () => {
    const dataDir = folder()
    const clock = new FixedClock({ now: start })
    const ports = localPorts(clock, dataDir)
    const { handlers } = buildHandlers(ports, () => new FakeJobRunner())
    const agent = localAgent({
      model: routerAgentModel("comfyui-owner"),
      dataDir,
      clock,
      apps: ports.apps,
      handlers,
    })
    const app = ownerGateway(
      handlers,
      ports.apps,
      { mode: "local" },
      clock,
      agent
    )

    const response = await call(app, startPath, { method: "POST" })

    expect(response.status).toBe(201)
    expect(conversationResponse.parse(await response.json())).toMatchObject({
      conversation: { createdAt: start.toISOString(), runApproval: "auto" },
    })
    expect(existsSync(join(dataDir, agentFileName))).toBe(true)
    await agent?.close()
  })

  it("answers a model the Router chat list does not hold with a typed error", async () => {
    const dataDir = folder()
    const clock = new FixedClock({ now: start })
    const ports = localPorts(clock, dataDir)
    const { handlers } = buildHandlers(ports, () => new FakeJobRunner())
    const agent = localAgent({
      model: {
        provider: routerChat.provider,
        model: "no-such-model",
        apiKey: "comfyui-owner",
      },
      dataDir,
      clock,
      apps: ports.apps,
      handlers,
    })
    const app = ownerGateway(
      handlers,
      ports.apps,
      { mode: "local" },
      clock,
      agent
    )

    const response = await call(app, startPath, { method: "POST" })

    expect(response.status).toBe(412)
    expect(await codeOf(response)).toBe("AGENT_MODEL_UNKNOWN")
  })
})
