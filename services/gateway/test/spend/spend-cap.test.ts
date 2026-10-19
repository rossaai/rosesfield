import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildPath, errorEnvelope, routes } from "@rosesfield/contract"
import type { Fetch } from "@rosesfield/generation"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { readServerEnv } from "#env"
import { accountResponse, accountRoutes } from "#session/account.contract"
import { balancePath, fakeComfy } from "../fixtures/comfy-fetch"
import { pageHtml } from "../fixtures/public-gateway"
import { type Seen, Visitor } from "../fixtures/visitor"
import { imageApp, ownerToken, start } from "../sample-apps"

const creditsPerCent = 2.11
const folders: string[] = []
let gateway: LocalGateway | null = null

afterEach(async () => {
  await gateway?.close()
  gateway = null
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function openJudge(capCredits: string) {
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
      SPEND_CAP_CREDITS: capCredits,
      DATA_DIR: dataDir,
    }),
    apps: [imageApp()],
    clock: new FixedClock({ now: start }),
    platformRoot,
    fetch,
  })
  gateway = opened
  const seen: Seen[] = []
  const judge = new Visitor({
    app: opened.app,
    keys: { authorization: `Bearer ${ownerToken}` },
    seen,
  })
  const stranger = new Visitor({ app: opened.app, seen })
  return { balance, judge, stranger }
}

function spend(balance: { cents: number }, credits: number): void {
  balance.cents -= credits / creditsPerCent
}

async function capOf(judge: Visitor) {
  const body = accountResponse.parse(
    await (await judge.call(accountRoutes.getAccount.path)).json()
  )
  return body.account.cap
}

function startRun(judge: Visitor): Promise<Response> {
  return judge.call(
    buildPath(routes.startRun.path, { appId: "sample-image" }),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inputs: { prompt: "a red door" } }),
    }
  )
}

describe("the judge deployment's spend cap", () => {
  it("shows what is left of the cap from the real balance", async () => {
    const { balance, judge } = openJudge("800")

    expect(await capOf(judge)).toEqual({ credits: 800, left: 800 })
    spend(balance, 120.5)
    expect(await capOf(judge)).toEqual({ credits: 800, left: 679.5 })
  })

  it("refuses a run once the cap is spent, with a code that names the cap", async () => {
    const { balance, judge } = openJudge("800")
    await capOf(judge)

    spend(balance, 799)
    const allowed = await startRun(judge)
    spend(balance, 2)
    const refused = await startRun(judge)

    expect(allowed.status).toBe(202)
    expect(refused.status).toBe(412)
    expect(errorEnvelope.parse(await refused.json()).error.code).toBe(
      "SPEND_CAP_REACHED"
    )
    expect(await capOf(judge)).toEqual({ credits: 800, left: 0 })
  })

  it("asks for the owner token before it shows the cap", async () => {
    const { stranger } = openJudge("800")

    const answer = await stranger.call(accountRoutes.getAccount.path)

    expect(answer.status).toBe(401)
  })
})
