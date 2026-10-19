import type { Fetch } from "@rosesfield/generation"
import { afterEach, describe, expect, it } from "vitest"
import { accountResponse, accountRoutes } from "#session/account.contract"
import { keyHeaders } from "#session/visitor-keys"
import { accountPath, balancePath, fakeComfy } from "../fixtures/comfy-fetch"
import { type OpenedGateway, openGateway } from "../fixtures/public-gateway"

let opened: OpenedGateway | null = null

afterEach(async () => {
  await opened?.close()
  opened = null
})

type Mark = { path: string; at: "start" | "end" }

function timedComfy(marks: Mark[]): ReturnType<typeof fakeComfy> {
  const comfy = fakeComfy()
  const fetch: Fetch = async (input, init) => {
    const path = new URL(input instanceof Request ? input.url : String(input))
      .pathname
    marks.push({ path, at: "start" })
    if (path === accountPath) {
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
    const answer =
      path === balancePath
        ? Response.json({ amount_cents: 1000 })
        : await comfy.fetch(input, init)
    marks.push({ path, at: "end" })
    return answer
  }
  return { fetch, calls: comfy.calls }
}

describe("adding a key", () => {
  it("asks Comfy for the balance while the gateway looks up the account, and once for the account", async () => {
    const marks: Mark[] = []
    opened = openGateway({ comfy: timedComfy(marks) })
    const visitor = opened.visitor({ [keyHeaders.engine]: "comfyui-early" })

    const answer = accountResponse.parse(
      await (await visitor.call(accountRoutes.getAccount.path)).json()
    )

    const balanceStart = marks.findIndex(
      (mark) => mark.path === balancePath && mark.at === "start"
    )
    const accountEnd = marks.findIndex(
      (mark) => mark.path === accountPath && mark.at === "end"
    )
    expect(answer.account.credits).toBe(2110)
    expect(balanceStart).toBeGreaterThan(-1)
    expect(balanceStart).toBeLessThan(accountEnd)
    expect(
      marks.filter((mark) => mark.path === accountPath && mark.at === "start")
    ).toHaveLength(1)
  })
})
