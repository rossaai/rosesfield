import {
  conversationListResponse,
  conversationResponse,
  conversationRoutes,
} from "@rosesfield/agent"
import {
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runPageResponse,
} from "@rosesfield/contract"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestHarness } from "wrangler"
import { gatewayRoutes, settingsResponse } from "#gateway.contract"
import { sessionCookie } from "#session/session-cookie"
import { keyHeaders } from "#session/visitor-keys"
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
        AGENT_BASE_URL: "http://127.0.0.1:9/v1",
        AGENT_MODEL: "qwen3.8:27b",
      },
    },
  ],
})

const cookiePattern = new RegExp(`${sessionCookie.name}=([^;]+)`)

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
  private cookie: string | null = null

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

    const response = await visitor.call(gatewayRoutes.getSettings.path, {
      headers: { [keyHeaders.engine]: "comfyui-visitor-key" },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(
      settingsResponse.parse(await response.json()).settings
    ).toMatchObject({
      mode: "public",
      lock: "none",
      engine: { target: "comfy-cloud", key: "set", origin: "live" },
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
    const withoutModelKey = await owner.call(
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
    expect(await codeOf(withoutModelKey)).toBe("AGENT_MODEL_MISSING")
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
