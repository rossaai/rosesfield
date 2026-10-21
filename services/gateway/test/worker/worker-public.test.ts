import {
  conversationListResponse,
  conversationResponse,
  conversationRoutes,
  defaultChatModel,
  routerChat,
} from "@rosesfield/agent"
import {
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runPageResponse,
} from "@rosesfield/contract"
import { generateSignedCookie } from "hono/cookie"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestHarness } from "wrangler"
import { gatewayRoutes, settingsResponse } from "#gateway.contract"
import {
  accountSessionOf,
  keyTagOf,
  sessionCookie,
} from "#session/session-cookie"
import { keyHeaders } from "#session/visitor-keys"
import { moveAgentHost } from "#worker/agent-forward"
import { pngBytes, sessionSecret } from "../sample-apps"
import { gatewayRoot, testConfig } from "./platform-proxy"

const worker = createTestHarness({
  root: gatewayRoot,
  workers: [
    {
      configPath: testConfig,
      secrets: {
        MODE: "public",
        SESSION_SECRET: sessionSecret,
        SESSION_REQUESTS_PER_MINUTE: "1000",
      },
    },
  ],
})

const cookiePattern = new RegExp(`${sessionCookie.name}=([^;]+)`)

async function accountCookie(key: string, accountId: string): Promise<string> {
  const value = `${await accountSessionOf(accountId)}${sessionCookie.tagMark}${await keyTagOf(sessionSecret, key)}`
  const signed = await generateSignedCookie(
    sessionCookie.name,
    value,
    sessionSecret
  )
  return cookiePattern.exec(signed)?.[1] ?? ""
}

beforeAll(async () => {
  await worker.listen()
  await worker.getWorker().applyD1Migrations("DB")
})

afterAll(() => worker.close())

type CallInit = {
  method?: string
  headers?: Record<string, string>
  body?: string | Uint8Array
}

type WorkerResponse = Awaited<ReturnType<typeof worker.fetch>>

class WorkerVisitor {
  cookie: string | null = null

  async call(path: string, init: CallInit = {}): Promise<WorkerResponse> {
    const response = await worker.fetch(`https://demo.rosesfield.test${path}`, {
      ...init,
      headers: {
        ...init.headers,
        ...(this.cookie === null
          ? {}
          : { cookie: `${sessionCookie.name}=${this.cookie}` }),
      },
    })
    const set = cookiePattern.exec(response.headers.get("set-cookie") ?? "")
    if (set?.[1] !== undefined) {
      this.cookie = set[1]
    }
    return response
  }
}

async function codeOf(response: WorkerResponse): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

describe("the Workers entry in public mode", () => {
  it("serves a visitor without an owner token and keeps their session in a signed cookie", async () => {
    const visitor = new WorkerVisitor()
    visitor.cookie = await accountCookie("comfyui-visitor-key", "uid-visitor")

    const response = await visitor.call(gatewayRoutes.getSettings.path, {
      headers: { [keyHeaders.engine]: "comfyui-visitor-key" },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(
      settingsResponse.parse(await response.json()).settings
    ).toMatchObject({
      mode: "public",
      place: "workers",
      lock: "none",
      engine: { target: "comfy-cloud", key: "set", origin: "live" },
      agent: {
        model: "set",
        models: [{ provider: routerChat.provider, id: defaultChatModel }],
      },
    })
  })

  it("keeps one visitor's assets, runs and conversations from another, through D1 and the agent's Durable Object", async () => {
    const owner = new WorkerVisitor()
    const stranger = new WorkerVisitor()
    const uploaded = await owner.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: pngBytes,
    })
    const { asset } = assetResponse.parse(await uploaded.json())
    const started = await owner.call(
      conversationRoutes.startConversation.path,
      {
        method: "POST",
      }
    )
    const { conversation } = conversationResponse.parse(await started.json())

    const ownList = conversationListResponse.parse(
      await (await owner.call(conversationRoutes.listConversations.path)).json()
    )
    const strangerList = conversationListResponse.parse(
      await (
        await stranger.call(conversationRoutes.listConversations.path)
      ).json()
    )
    const strangerAsset = await stranger.call(
      buildPath(routes.getAsset.path, { assetId: asset.id })
    )
    const strangerRuns = runPageResponse.parse(
      await (await stranger.call(routes.listRuns.path)).json()
    )
    const strangerRead = await stranger.call(
      buildPath(conversationRoutes.readConversation.path, {
        conversationId: conversation.id,
      })
    )
    const withoutKey = await owner.call(
      buildPath(conversationRoutes.sendMessage.path, {
        conversationId: conversation.id,
      }),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Hi" }),
      }
    )

    expect(ownList.conversations.map((one) => one.id)).toEqual([
      conversation.id,
    ])
    expect(strangerList.conversations).toEqual([])
    expect(strangerAsset.status).toBe(404)
    expect(strangerRuns.runs).toEqual([])
    expect(strangerRead.status).toBe(404)
    expect(await codeOf(withoutKey)).toBe("AGENT_MODEL_MISSING")
  })

  it("moves a visitor's conversations to the account's agent host when the key is added", async () => {
    const before = new WorkerVisitor()
    const started = await before.call(
      conversationRoutes.startConversation.path,
      { method: "POST" }
    )
    const { conversation } = conversationResponse.parse(await started.json())
    const anonymous =
      decodeURIComponent(before.cookie ?? "").split(".")[0] ?? ""
    const env = await worker.getWorker().getEnv()
    const accountKey = "comfyui-mover-key"

    await moveAgentHost(
      env.AGENTS,
      anonymous,
      await accountSessionOf("uid-mover")
    )
    const keyed = new WorkerVisitor()
    keyed.cookie = await accountCookie(accountKey, "uid-mover")
    const moved = conversationListResponse.parse(
      await (
        await keyed.call(conversationRoutes.listConversations.path, {
          headers: { [keyHeaders.engine]: accountKey },
        })
      ).json()
    )
    const left = conversationListResponse.parse(
      await (
        await before.call(conversationRoutes.listConversations.path)
      ).json()
    )

    expect(moved.conversations.map((one) => one.id)).toEqual([conversation.id])
    expect(left.conversations).toEqual([])
  })

  it("deletes expired records on its hourly schedule", async () => {
    const env = await worker.getWorker().getEnv()
    const db: D1Database = env.DB
    const bucket: R2Bucket = env.BUCKET
    const old = Date.now() - 30 * 86_400_000
    const assetId = "0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f"
    await db
      .prepare(
        "insert into assets (id, kind, mime, bytes, width, height, duration_seconds, source_run_id, created_at) values (?, 'image', 'image/png', 12, null, null, null, null, ?)"
      )
      .bind(assetId, old)
      .run()
    await bucket.put(`assets/${assetId}`, pngBytes)

    await worker
      .getWorker()
      .scheduled({ cron: "17 * * * *", scheduledTime: new Date() })

    const left = await db
      .prepare("select count(*) as count from assets where id = ?")
      .bind(assetId)
      .first<{ count: number }>()
    expect(left?.count).toBe(0)
    expect(await bucket.get(`assets/${assetId}`)).toBeNull()
  })
})
