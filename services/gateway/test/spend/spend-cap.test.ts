import { Database } from "bun:sqlite"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { conversationRoutes } from "@rosesfield/agent"
import {
  accountResponse,
  accountRoutes,
  buildPath,
  errorEnvelope,
  type RouteDefinition,
  routes,
  runResponse,
} from "@rosesfield/contract"
import type { Fetch } from "@rosesfield/generation"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { readServerEnv } from "#env"
import { spending } from "#gateway"
import { mcpPath } from "#mcp/mcp-route"
import { balancePath, fakeComfy } from "../fixtures/comfy-fetch"
import { pageHtml } from "../fixtures/public-gateway"
import { type Seen, Visitor } from "../fixtures/visitor"
import { imageApp, ownerToken, start } from "../sample-apps"

const creditsPerCent = 2.11
const uuid = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01"
const folders: string[] = []
const gateways: LocalGateway[] = []

afterEach(async () => {
  for (const gateway of gateways.splice(0)) {
    await gateway.close()
  }
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

type JudgeSettings = {
  cap?: number
  unknownRunCredits?: number
}

function openJudge(settings: JudgeSettings) {
  const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-judge-"))
  folders.push(dataDir)
  const platformRoot = join(dataDir, "platform")
  mkdirSync(platformRoot)
  writeFileSync(join(platformRoot, "index.html"), pageHtml)
  const comfy = fakeComfy()
  const balance = { cents: 1000 }
  const fetch: Fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    if (url.pathname === balancePath) {
      return Response.json({ amount_cents: balance.cents })
    }
    return comfy.fetch(input, init)
  }
  const opened = composeLocalGateway({
    env: readServerEnv({
      MODE: "owner",
      HOST: "0.0.0.0",
      OWNER_TOKEN: ownerToken,
      COMFY_API_KEY: "comfyui-company-key",
      DATA_DIR: dataDir,
      ...(settings.cap === undefined
        ? {}
        : { SPEND_CAP_CREDITS: String(settings.cap) }),
      ...(settings.unknownRunCredits === undefined
        ? {}
        : { SPEND_UNKNOWN_RUN_CREDITS: String(settings.unknownRunCredits) }),
    }),
    apps: [imageApp()],
    clock: new FixedClock({ now: start }),
    platformRoot,
    fetch,
  })
  gateways.push(opened)
  const seen: Seen[] = []
  const judge = new Visitor({
    app: opened.app,
    keys: { authorization: `Bearer ${ownerToken}` },
    seen,
  })
  const stranger = new Visitor({ app: opened.app, seen })
  return { balance, judge, stranger, dataDir }
}

async function accountOf(judge: Visitor) {
  const body = accountResponse.parse(
    await (await judge.call(accountRoutes.getAccount.path)).json()
  )
  return body.account
}

function startRun(judge: Visitor, count = 1): Promise<Response> {
  return judge.call(
    buildPath(routes.startRun.path, { appId: "sample-image" }),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inputs: { prompt: "a red door" }, count }),
    }
  )
}

async function codeOf(response: Response): Promise<string> {
  return errorEnvelope.parse(await response.clone().json()).error.code
}

function pathOf(route: RouteDefinition): string {
  return route.path.replace(/:[A-Za-z]+/g, uuid)
}

function callRoute(judge: Visitor, route: RouteDefinition): Promise<Response> {
  return judge.call(pathOf(route), {
    method: route.method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ inputs: { prompt: "a red door" }, text: "hello" }),
  })
}

function mcpCall(judge: Visitor, method: string): Promise<Response> {
  return judge.call(mcpPath, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params:
        method === "tools/call"
          ? { name: "sample-image", arguments: { prompt: "a red door" } }
          : {},
    }),
  })
}

describe("the judge deployment's spend cap", () => {
  it("counts only the runs of this deployment, not the account's other spending", async () => {
    const { balance, judge } = openJudge({ cap: 800, unknownRunCredits: 30 })

    const before = await accountOf(judge)
    balance.cents -= 500 / creditsPerCent
    const elsewhere = await accountOf(judge)
    const started = await startRun(judge)
    const after = await accountOf(judge)

    expect(before.cap).toEqual({ credits: 800, left: 800 })
    expect(elsewhere.cap).toEqual({ credits: 800, left: 800 })
    expect(started.status).toBe(202)
    expect(after.cap).toEqual({ credits: 800, left: 770 })
  })

  it("shows a judge what is left of the cap, never the account's balance", async () => {
    const capped = openJudge({ cap: 800 })
    const uncapped = openJudge({})

    const judgeSees = await accountOf(capped.judge)
    const ownerSees = await accountOf(uncapped.judge)

    expect(judgeSees.key).toBe("valid")
    expect(judgeSees.credits).toBeNull()
    expect(judgeSees.cap).toEqual({ credits: 800, left: 800 })
    expect(ownerSees.credits).toBe(2110)
  })

  it("refuses a run whose outputs do not all fit in what is left", async () => {
    const { judge } = openJudge({ cap: 100, unknownRunCredits: 30 })

    const four = await startRun(judge, 4)
    const three = await startRun(judge, 3)
    const one = await startRun(judge, 1)

    expect(four.status).toBe(412)
    expect(await codeOf(four)).toBe("SPEND_CAP_REACHED")
    expect(three.status).toBe(202)
    expect(one.status).toBe(412)
    expect((await accountOf(judge)).cap).toEqual({ credits: 100, left: 10 })
  })

  it("prices a repeat in full before it starts", async () => {
    const tight = openJudge({ cap: 100, unknownRunCredits: 30 })
    const roomy = openJudge({ cap: 200, unknownRunCredits: 30 })
    const repeatOf = async (judge: Visitor) => {
      const { run } = runResponse.parse(await (await startRun(judge, 2)).json())
      return judge.call(buildPath(routes.repeatRun.path, { runId: run.id }), {
        method: "POST",
      })
    }

    const refused = await repeatOf(tight.judge)
    const allowed = await repeatOf(roomy.judge)

    expect(refused.status).toBe(412)
    expect(await codeOf(refused)).toBe("SPEND_CAP_REACHED")
    expect(allowed.status).toBe(202)
  })

  it("guards every route the contracts mark as spending, and /mcp's tool calls", async () => {
    const { judge } = openJudge({ cap: 20, unknownRunCredits: 30 })

    const marked = spending.map((route) => route.path)
    const answers = await Promise.all(
      spending.map(async (route) => codeOf(await callRoute(judge, route)))
    )
    const toolCall = await mcpCall(judge, "tools/call")
    const toolList = await mcpCall(judge, "tools/list")
    const listRuns = await judge.call(routes.listRuns.path)

    expect(marked).toEqual(
      expect.arrayContaining([
        routes.startRun.path,
        routes.repeatRun.path,
        conversationRoutes.startConversation.path,
        conversationRoutes.sendMessage.path,
        conversationRoutes.acceptProposal.path,
      ])
    )
    expect(answers.every((code) => code === "SPEND_CAP_REACHED")).toBe(true)
    expect(toolCall.status).toBe(412)
    expect(await codeOf(toolCall)).toBe("SPEND_CAP_REACHED")
    expect(toolList.status).not.toBe(412)
    expect(listRuns.status).toBe(200)
  })

  it("lets the agent and /mcp through while the cap has room", async () => {
    const { judge } = openJudge({ cap: 800, unknownRunCredits: 30 })

    const answers = await Promise.all(
      spending
        .filter(
          (route) => route !== routes.startRun && route !== routes.repeatRun
        )
        .map(async (route) => (await callRoute(judge, route)).text())
    )
    const toolCall = await (await mcpCall(judge, "tools/call")).text()

    expect(answers).toHaveLength(3)
    expect(answers.some((body) => body.includes("SPEND_CAP"))).toBe(false)
    expect(toolCall).not.toContain("SPEND_CAP")
  })

  it("refuses every paid run when it cannot read what was spent", async () => {
    const { judge, dataDir } = openJudge({ cap: 800, unknownRunCredits: 30 })

    const readable = await startRun(judge)
    const database = new Database(join(dataDir, "rosesfield.db"))
    database.run("DROP TABLE spend_holds")
    database.close()
    const unreadable = await startRun(judge)
    const toolCall = await mcpCall(judge, "tools/call")

    expect(readable.status).toBe(202)
    expect(await codeOf(unreadable)).toBe("SPEND_CAP_UNREADABLE")
    expect(await codeOf(toolCall)).toBe("SPEND_CAP_UNREADABLE")
  })

  it("asks for the owner token before it shows the cap", async () => {
    const { stranger } = openJudge({ cap: 800 })

    const answer = await stranger.call(accountRoutes.getAccount.path)

    expect(answer.status).toBe(401)
  })
})
