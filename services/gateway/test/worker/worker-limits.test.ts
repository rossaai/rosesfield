import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestHarness } from "wrangler"
import { gatewayRoutes } from "#gateway.contract"
import { sessionCookie } from "#session/session-cookie"
import { sessionSecret } from "../sample-apps"
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
        NEW_SESSIONS_PER_MINUTE: "3",
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

async function newSessionFrom(address: string) {
  const response = await worker.fetch(
    `https://demo.rosesfield.test${gatewayRoutes.getHealth.path}`,
    { headers: { "cf-connecting-ip": address } }
  )
  await response.text()
  return {
    status: response.status,
    cookie: cookiePattern.exec(response.headers.get("set-cookie") ?? "")?.[1],
  }
}

describe("the Workers entry's limits in public mode", () => {
  it("counts new sessions by the address Cloudflare sends in cf-connecting-ip", async () => {
    const answers = []
    for (let request = 0; request < 4; request += 1) {
      answers.push(await newSessionFrom("203.0.113.7"))
    }
    const other = await newSessionFrom("198.51.100.4")

    expect(answers.map((answer) => answer.status)).toEqual([200, 200, 200, 429])
    expect(answers.map((answer) => answer.cookie !== undefined)).toEqual([
      true,
      true,
      true,
      false,
    ])
    expect(other.status).toBe(200)
  })
})
