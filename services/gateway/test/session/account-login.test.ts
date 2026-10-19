import {
  conversationListResponse,
  conversationResponse,
  conversationRoutes,
} from "@rosesfield/agent"
import { accountRoutes, routes, runPageResponse } from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { sessionCookie } from "#session/session-cookie"
import { keyHeaders } from "#session/visitor-keys"
import { accountPath } from "../fixtures/comfy-fetch"
import {
  finishedRun,
  type OpenedGateway,
  openGateway,
} from "../fixtures/public-gateway"
import type { Visitor } from "../fixtures/visitor"

const firstKey = "comfyui-key1--sameaccount"
const secondKey = "comfyui-key2--sameaccount"
const otherKey = "comfyui-key3-otheraccount"

let opened: OpenedGateway | null = null

afterEach(async () => {
  await opened?.close()
  opened = null
})

const agentSettings = {
  AGENT_BASE_URL: "http://127.0.0.1:9/v1",
  AGENT_MODEL: "qwen3.8:27b",
}

async function conversationIds(visitor: Visitor): Promise<string[]> {
  const list = conversationListResponse.parse(
    await (await visitor.call(conversationRoutes.listConversations.path)).json()
  )
  return list.conversations.map((one) => one.id)
}

async function runIds(visitor: Visitor): Promise<string[]> {
  const page = runPageResponse.parse(
    await (await visitor.call(routes.listRuns.path)).json()
  )
  return page.runs.map((run) => run.id)
}

describe("your Comfy key as your login", () => {
  it("opens the same work on a second device and with a new key of the same account", async () => {
    opened = openGateway()
    const laptop = opened.visitor({ [keyHeaders.engine]: firstKey })
    const run = await finishedRun(laptop, "a red door")

    const phone = opened.visitor({ [keyHeaders.engine]: firstKey })
    const rotated = opened.visitor({ [keyHeaders.engine]: secondKey })
    const stranger = opened.visitor({ [keyHeaders.engine]: otherKey })

    expect(await runIds(phone)).toEqual([run.id])
    expect(await runIds(rotated)).toEqual([run.id])
    expect(await runIds(stranger)).toEqual([])
  })

  it("asks Comfy for the account once per key, and opens nothing with the cookie alone", async () => {
    opened = openGateway()
    const laptop = opened.visitor({ [keyHeaders.engine]: firstKey })
    const run = await finishedRun(laptop, "a red door")
    const cookieOnly = laptop.withoutKeys()

    const withoutKey = await runIds(cookieOnly)
    laptop.cookie = cookieOnly.cookie
    const withKey = await runIds(laptop)

    const lookups = opened.comfy.calls.filter(
      (call) => call.path === accountPath
    )
    expect(withoutKey).toEqual([])
    expect(withKey).toEqual([run.id])
    expect(lookups).toHaveLength(1)
  })

  it("opens nothing for the account's cookie with a key that Comfy refuses", async () => {
    opened = openGateway()
    const laptop = opened.visitor({ [keyHeaders.engine]: firstKey })
    await finishedRun(laptop, "a red door")
    const refused = opened.visitor({
      [keyHeaders.engine]: "comfyui-refused-sameaccount",
    })
    refused.cookie = laptop.cookie

    expect(await runIds(refused)).toEqual([])
  })

  it("forgets the key: its route clears the cookie", async () => {
    opened = openGateway()
    const laptop = opened.visitor({ [keyHeaders.engine]: firstKey })
    await finishedRun(laptop, "a red door")

    const forgot = await laptop.call(accountRoutes.forgetAccount.path, {
      method: accountRoutes.forgetAccount.method,
    })
    const cleared = forgot.headers.get("set-cookie") ?? ""

    expect(forgot.status).toBe(204)
    expect(cleared).toContain(`${sessionCookie.name}=;`)
    expect(cleared).toContain("Max-Age=0")
  })

  it("keeps the work made before the key under the account the key opens", async () => {
    opened = openGateway()
    const before = opened.visitor()
    const made = await finishedRun(before, "a blue door")
    const after = before.withoutKeys()
    const keyed = opened.visitor({ [keyHeaders.engine]: firstKey })
    keyed.cookie = after.cookie

    expect(await runIds(keyed)).toEqual([made.id])
    expect(
      await runIds(opened.visitor({ [keyHeaders.engine]: secondKey }))
    ).toEqual([made.id])
  })

  it("moves the conversations made before the key to the account the key opens", async () => {
    opened = openGateway({ settings: agentSettings })
    const before = opened.visitor()
    const started = await before.call(
      conversationRoutes.startConversation.path,
      { method: "POST" }
    )
    const { conversation } = conversationResponse.parse(await started.json())
    const keyed = opened.visitor({ [keyHeaders.engine]: firstKey })
    keyed.cookie = before.cookie

    const moved = await conversationIds(keyed)
    const phone = await conversationIds(
      opened.visitor({ [keyHeaders.engine]: secondKey })
    )

    expect(moved).toEqual([conversation.id])
    expect(phone).toEqual([conversation.id])
  })

  it("keeps a refused key out of every account", async () => {
    opened = openGateway()
    const owner = opened.visitor({ [keyHeaders.engine]: firstKey })
    await finishedRun(owner, "a red door")

    const refused = opened.visitor({
      [keyHeaders.engine]: "comfyui-refused-sameaccount",
    })

    expect(await runIds(refused)).toEqual([])
  })
})
