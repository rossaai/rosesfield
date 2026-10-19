import { routes } from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { callRoute } from "@/api/call-route"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import { forgetOwnerToken, keepOwnerToken } from "@/api/owner-token"

const realFetch = globalThis.fetch
const appId = "sample-image"

type Sent = { url: string; init: RequestInit | undefined }

function answer(response: () => Response): Sent[] {
  const sent: Sent[] = []
  globalThis.fetch = async (input, init) => {
    sent.push({ url: String(input), init })
    return response()
  }
  return sent
}

afterEach(async () => {
  globalThis.fetch = realFetch
  await forgetOwnerToken()
})

describe("callRoute", () => {
  it("builds the path and the query from the route manifest", async () => {
    const sent = answer(() => Response.json({ runs: [], next: null }))
    const page = await callRoute(routes.listRuns, {
      query: { appId, cursor: "abc" },
    })
    expect(page).toEqual({ runs: [], next: null })
    expect(sent[0]?.url).toBe(`/api/runs?appId=${appId}&cursor=abc`)
    expect(sent[0]?.init?.method).toBe("GET")
  })

  it("sends the owner token, the idempotency key and a JSON body", async () => {
    await keepOwnerToken("a-token-that-the-owner-set")
    const sent = answer(() => Response.json({}, { status: 500 }))
    await callRoute(routes.startRun, {
      params: { appId },
      body: { inputs: { prompt: "A lake" } },
      idempotencyKey: "key-1",
    }).catch(() => undefined)
    const headers = new Headers(sent[0]?.init?.headers)
    expect(sent[0]?.url).toBe(`/api/apps/${appId}/runs`)
    expect(headers.get("Authorization")).toBe(
      "Bearer a-token-that-the-owner-set"
    )
    expect(headers.get("Idempotency-Key")).toBe("key-1")
    expect(headers.get("Content-Type")).toBe("application/json")
    expect(sent[0]?.init?.body).toBe('{"inputs":{"prompt":"A lake"}}')
  })

  it("turns a refusal into its stable code and its wait", async () => {
    answer(() =>
      Response.json(
        { error: { code: "ENGINE_RATE_LIMITED", status: 429 } },
        { status: 429, headers: { "Retry-After": "12" } }
      )
    )
    await expect(callRoute(routes.listApps, {})).rejects.toMatchObject({
      constructor: GatewayRefusedError,
      code: "ENGINE_RATE_LIMITED",
      status: 429,
      retryAfterSeconds: 12,
    })
  })

  it("refuses a body that breaks the response schema", async () => {
    answer(() => Response.json({ apps: "none" }))
    await expect(callRoute(routes.listApps, {})).rejects.toMatchObject({
      code: "RESPONSE_INVALID",
    })
  })

  it("names a failed connection apart from a refusal", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch")
    }
    await expect(callRoute(routes.listApps, {})).rejects.toBeInstanceOf(
      GatewayUnreachableError
    )
  })
})
