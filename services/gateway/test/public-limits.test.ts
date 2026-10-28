import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { errorEnvelope } from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { readServerEnv } from "#env"
import { gatewayRoutes } from "#gateway.contract"
import { keyHeaders } from "#session/visitor-keys"
import { accountPath, fakeComfy } from "./fixtures/comfy-fetch"
import { Visitor } from "./fixtures/visitor"
import { imageApp, sessionSecret, start } from "./sample-apps"

const folders: string[] = []
let gateway: LocalGateway | null = null

afterEach(async () => {
  await gateway?.close()
  gateway = null
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function fail(): never {
  throw new Error("The gateway is closed")
}

function openPublic(
  settings: Record<string, string>,
  clock = new FixedClock({ now: start })
) {
  const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-limits-"))
  folders.push(dataDir)
  const comfy = fakeComfy()
  gateway = composeLocalGateway({
    env: readServerEnv({
      MODE: "public",
      HOST: "0.0.0.0",
      SESSION_SECRET: sessionSecret,
      DATA_DIR: dataDir,
      ...settings,
    }),
    apps: [imageApp()],
    clock,
    platformRoot: null,
    fetch: comfy.fetch,
  })
  const visitor = (keys: Record<string, string> = {}) =>
    new Visitor({ app: gateway?.app ?? fail(), keys, seen: [] })
  return { comfy, visitor }
}

async function codeOf(response: Response): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

describe("the limits of a public deployment", () => {
  it("limits the requests of one session per minute", async () => {
    const clock = new FixedClock({ now: start })
    const { visitor } = openPublic({ SESSION_REQUESTS_PER_MINUTE: "3" }, clock)
    const busy = visitor()
    const calm = visitor()

    const answers = []
    for (let request = 0; request < 4; request += 1) {
      answers.push(await busy.call(gatewayRoutes.getHealth.path))
    }
    const other = await calm.call(gatewayRoutes.getHealth.path)
    clock.advance(60_000)
    const later = await busy.call(gatewayRoutes.getHealth.path)

    expect(answers.map((answer) => answer.status)).toEqual([200, 200, 200, 429])
    expect(await codeOf(answers[3] ?? fail())).toBe("SESSION_RATE_LIMITED")
    expect(answers[3]?.headers.get("retry-after")).toBe("60")
    expect(other.status).toBe(200)
    expect(later.status).toBe(200)
  })

  it("limits a client that drops its session cookie by its address", async () => {
    const { visitor } = openPublic({ NEW_SESSIONS_PER_MINUTE: "3" })

    const answers = []
    for (let request = 0; request < 4; request += 1) {
      answers.push(await visitor().call(gatewayRoutes.getHealth.path))
    }

    expect(answers.map((answer) => answer.status)).toEqual([200, 200, 200, 429])
    expect(await codeOf(answers[3] ?? fail())).toBe("SESSION_RATE_LIMITED")
  })

  it("limits a client that sends its account cookie without its key by that account", async () => {
    const { visitor } = openPublic({ SESSION_REQUESTS_PER_MINUTE: "3" })
    const keyed = visitor({ [keyHeaders.engine]: "comfyui-visitor-key" })

    const first = await keyed.call(gatewayRoutes.getHealth.path)
    const keyless = keyed.withoutKeys()
    const answers = [first]
    for (let request = 0; request < 3; request += 1) {
      answers.push(await keyless.call(gatewayRoutes.getHealth.path))
    }

    expect(keyed.cookie).toMatch(/^a-[0-9a-f]{64}~/)
    expect(answers.map((answer) => answer.status)).toEqual([200, 200, 200, 429])
  })

  it("gives a cookie only to a request the limit allows, so one address cannot collect more sessions than the new-session limit", async () => {
    const { visitor } = openPublic({
      NEW_SESSIONS_PER_MINUTE: "3",
      CLIENT_ADDRESS_HEADER: "cf-connecting-ip",
    })
    const from = { "cf-connecting-ip": "203.0.113.7" }

    const answers = []
    const cookies = []
    for (let request = 0; request < 10; request += 1) {
      const collector = visitor()
      answers.push(
        await collector.call(gatewayRoutes.getHealth.path, { headers: from })
      )
      cookies.push(collector.cookie)
    }
    const other = await visitor().call(gatewayRoutes.getHealth.path, {
      headers: { "cf-connecting-ip": "198.51.100.4" },
    })

    expect(answers.map((answer) => answer.status)).toEqual([
      200, 200, 200, 429, 429, 429, 429, 429, 429, 429,
    ])
    expect(cookies.filter((cookie) => cookie !== null)).toHaveLength(3)
    expect(
      answers.filter((answer) => answer.headers.has("set-cookie"))
    ).toHaveLength(3)
    expect(other.status).toBe(200)
  })

  it("counts every address of one IPv6 /64 in one slot", async () => {
    const { visitor } = openPublic({
      NEW_SESSIONS_PER_MINUTE: "1",
      CLIENT_ADDRESS_HEADER: "cf-connecting-ip",
    })
    const from = (address: string) =>
      visitor().call(gatewayRoutes.getHealth.path, {
        headers: { "cf-connecting-ip": address },
      })

    const first = await from("2001:db8:1:2::1")
    const sameNetwork = await from("2001:0db8:0001:0002:ffff:aaaa:bbbb:9")
    const otherNetwork = await from("2001:db8:1:3::1")

    expect([first.status, sameNetwork.status, otherNetwork.status]).toEqual([
      200, 429, 200,
    ])
  })

  it("trusts no address header unless CLIENT_ADDRESS_HEADER names it", async () => {
    const { visitor } = openPublic({ NEW_SESSIONS_PER_MINUTE: "1" })

    const first = await visitor().call(gatewayRoutes.getHealth.path, {
      headers: { "cf-connecting-ip": "203.0.113.7" },
    })
    const forged = await visitor().call(gatewayRoutes.getHealth.path, {
      headers: { "cf-connecting-ip": "198.51.100.4" },
    })

    expect([first.status, forged.status]).toEqual([200, 429])
  })

  it("checks the limit before it asks Comfy whose key a new client sends", async () => {
    const { visitor, comfy } = openPublic({
      NEW_SESSIONS_PER_MINUTE: "2",
      CLIENT_ADDRESS_HEADER: "cf-connecting-ip",
    })

    const answers = []
    for (let request = 0; request < 4; request += 1) {
      answers.push(
        await visitor({
          [keyHeaders.engine]: `comfyui-refused-${request}`,
        }).call(gatewayRoutes.getHealth.path, {
          headers: { "cf-connecting-ip": "203.0.113.7" },
        })
      )
    }

    expect(answers.map((answer) => answer.status)).toEqual([200, 200, 429, 429])
    expect(
      comfy.calls.filter((call) => call.path === accountPath)
    ).toHaveLength(2)
  })

  it("counts each new key a held cookie sends against the new-session limit before it asks Comfy", async () => {
    const { visitor, comfy } = openPublic({
      NEW_SESSIONS_PER_MINUTE: "3",
      CLIENT_ADDRESS_HEADER: "cf-connecting-ip",
    })
    const from = { headers: { "cf-connecting-ip": "203.0.113.7" } }
    const first = visitor()
    await first.call(gatewayRoutes.getHealth.path, from)

    const statuses = []
    for (let request = 0; request < 10; request += 1) {
      const holder = visitor({
        [keyHeaders.engine]: `comfyui-held-${request}`,
      })
      holder.cookie = first.cookie
      statuses.push(
        (await holder.call(gatewayRoutes.getHealth.path, from)).status
      )
    }
    const known = visitor({ [keyHeaders.engine]: "comfyui-held-0" })
    known.cookie = first.cookie
    const again = await known.call(gatewayRoutes.getHealth.path, {
      headers: { "cf-connecting-ip": "198.51.100.4" },
    })

    expect(statuses).toEqual([200, 200, 429, 429, 429, 429, 429, 429, 429, 429])
    expect(
      comfy.calls.filter((call) => call.path === accountPath)
    ).toHaveLength(2)
    expect(again.status).toBe(200)
  })

  it("limits the Comfy key lookups of one held cookie across addresses", async () => {
    const { visitor, comfy } = openPublic({
      NEW_SESSIONS_PER_MINUTE: "3",
      CLIENT_ADDRESS_HEADER: "cf-connecting-ip",
    })
    const first = visitor()
    await first.call(gatewayRoutes.getHealth.path, {
      headers: { "cf-connecting-ip": "203.0.113.7" },
    })

    const statuses = []
    for (let request = 0; request < 6; request += 1) {
      const holder = visitor({
        [keyHeaders.engine]: `comfyui-refused-${request}`,
      })
      holder.cookie = first.cookie
      statuses.push(
        (
          await holder.call(gatewayRoutes.getHealth.path, {
            headers: { "cf-connecting-ip": `198.51.100.${request + 1}` },
          })
        ).status
      )
    }

    expect(statuses).toEqual([200, 200, 200, 429, 429, 429])
    expect(
      comfy.calls.filter((call) => call.path === accountPath)
    ).toHaveLength(3)
  })

  it("serves an API client that sends its key with no cookie past the new-session limit, asking Comfy once", async () => {
    const { visitor, comfy } = openPublic({
      CLIENT_ADDRESS_HEADER: "cf-connecting-ip",
    })

    const statuses = []
    for (let request = 0; request < 40; request += 1) {
      const answer = await visitor({
        [keyHeaders.engine]: "comfyui-api-client",
      }).call(gatewayRoutes.getHealth.path, {
        headers: { "cf-connecting-ip": "203.0.113.7" },
      })
      statuses.push(answer.status)
    }

    expect(statuses.filter((status) => status === 200)).toHaveLength(40)
    expect(
      comfy.calls.filter((call) => call.path === accountPath)
    ).toHaveLength(1)
  })

  it("limits the requests of one address across all the sessions it keeps", async () => {
    const { visitor } = openPublic({
      ADDRESS_REQUESTS_PER_MINUTE: "5",
      CLIENT_ADDRESS_HEADER: "cf-connecting-ip",
    })
    const from = { headers: { "cf-connecting-ip": "203.0.113.7" } }
    const kept = [visitor(), visitor(), visitor()]

    const statuses = []
    for (let round = 0; round < 2; round += 1) {
      for (const one of kept) {
        statuses.push(
          (await one.call(gatewayRoutes.getHealth.path, from)).status
        )
      }
    }
    const other = await visitor().call(gatewayRoutes.getHealth.path, {
      headers: { "cf-connecting-ip": "198.51.100.4" },
    })

    expect(kept.every((one) => one.cookie !== null)).toBe(true)
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429])
    expect(other.status).toBe(200)
  })
})
