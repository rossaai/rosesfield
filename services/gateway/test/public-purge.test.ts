import { existsSync, mkdtempSync, rmSync, utimesSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  conversationListResponse,
  conversationResponse,
  conversationRoutes,
} from "@rosesfield/agent"
import {
  assetResponse,
  buildPath,
  characterResponse,
  errorEnvelope,
  routes,
  runPageResponse,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { readServerEnv } from "#env"
import { keyHeaders } from "#session/visitor-keys"
import { type Seen, Visitor } from "./fixtures/visitor"
import { imageApp, pngBytes, sessionSecret, start } from "./sample-apps"

const dayMs = 86_400_000
const folders: string[] = []
let gateway: LocalGateway | null = null

afterEach(async () => {
  await gateway?.close()
  gateway = null
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function openPublic(clock: FixedClock) {
  const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-purge-"))
  folders.push(dataDir)
  const opened = composeLocalGateway({
    env: readServerEnv({
      MODE: "public",
      HOST: "0.0.0.0",
      SESSION_SECRET: sessionSecret,
      DATA_DIR: dataDir,
      RETENTION_DAYS: "7",
      AGENT_BASE_URL: "http://127.0.0.1:11434/v1",
      AGENT_MODEL: "qwen3.8:27b",
    }),
    apps: [imageApp()],
    clock,
    platformRoot: null,
  })
  gateway = opened
  const seen: Seen[] = []
  const visitor = (keys: Record<string, string> = {}) =>
    new Visitor({ app: opened.app, keys, seen })
  return { dataDir, gateway: opened, visitor }
}

async function fill(visitor: Visitor) {
  const uploaded = await visitor.call(routes.uploadAsset.path, {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: pngBytes,
  })
  const { asset } = assetResponse.parse(await uploaded.json())
  const created = await visitor.call(routes.createCharacter.path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Ada", references: [asset.id], notes: "" }),
  })
  const { character } = characterResponse.parse(await created.json())
  const started = await visitor.call(
    buildPath(routes.startRun.path, { appId: "sample-image" }),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inputs: { prompt: "a red door" } }),
    }
  )
  const { run } = runResponse.parse(await started.json())
  return { asset, character, run }
}

describe("public mode's retention", () => {
  it("deletes the runs, assets, bytes and characters older than the retention and keeps the newer ones", async () => {
    const clock = new FixedClock({ now: start })
    const { dataDir, visitor } = openPublic(clock)
    const early = visitor()
    const old = await fill(early)
    clock.advance(8 * dayMs)
    const late = visitor()
    const kept = await fill(late)

    const purged = await gateway?.purge()

    expect(purged).toMatchObject({ runs: 1, assets: 1, characters: 1 })
    const oldRun = await early.call(
      buildPath(routes.getRun.path, { runId: old.run.id })
    )
    expect(errorEnvelope.parse(await oldRun.json()).error.code).toBe(
      "RUN_NOT_FOUND"
    )
    expect(existsSync(join(dataDir, "assets", old.asset.id))).toBe(false)
    const lateRuns = runPageResponse.parse(
      await (await late.call(routes.listRuns.path)).json()
    )
    expect(lateRuns.runs.map((run) => run.id)).toEqual([kept.run.id])
    const lateCharacter = await late.call(
      buildPath(routes.getCharacter.path, { characterId: kept.character.id })
    )
    expect(lateCharacter.status).toBe(200)
  })

  it("deletes a character that holds an expired asset, though the character is newer", async () => {
    const clock = new FixedClock({ now: start })
    const { visitor } = openPublic(clock)
    const one = visitor()
    const { asset } = await fill(one)
    clock.advance(6 * dayMs)
    const created = await one.call(routes.createCharacter.path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Bea", references: [asset.id], notes: "" }),
    })
    const { character } = characterResponse.parse(await created.json())
    clock.advance(2 * dayMs)

    await gateway?.purge()

    const read = await one.call(
      buildPath(routes.getCharacter.path, { characterId: character.id })
    )
    expect(read.status).toBe(404)
  })

  it("keeps each visitor's conversations apart, and deletes a session's conversations after the retention", async () => {
    const clock = new FixedClock({ now: start })
    const { dataDir, visitor } = openPublic(clock)
    const first = visitor({ [keyHeaders.agent]: "sk-visitor-one" })
    const second = visitor()
    const started = await first.call(
      conversationRoutes.startConversation.path,
      {
        method: "POST",
      }
    )
    const { conversation } = conversationResponse.parse(await started.json())

    const firstList = conversationListResponse.parse(
      await (await first.call(conversationRoutes.listConversations.path)).json()
    )
    const secondList = conversationListResponse.parse(
      await (
        await second.call(conversationRoutes.listConversations.path)
      ).json()
    )
    const secondSend = await second.call(
      buildPath(conversationRoutes.sendMessage.path, {
        conversationId: conversation.id,
      }),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Hi" }),
      }
    )

    expect(firstList.conversations.map((one) => one.id)).toEqual([
      conversation.id,
    ])
    expect(secondList.conversations).toEqual([])
    expect(secondSend.status).toBe(412)
    expect(errorEnvelope.parse(await secondSend.json()).error.code).toBe(
      "AGENT_MODEL_MISSING"
    )
    await gateway?.close()
    const file = join(
      dataDir,
      "agent-sessions",
      `${first.cookie?.split(".")[0]}.db`
    )
    expect(existsSync(file)).toBe(true)
    const keptFile = join(
      dataDir,
      "agent-sessions",
      `${second.cookie?.split(".")[0]}.db`
    )
    const past = new Date(start.getTime() - dayMs)
    utimesSync(file, past, past)
    clock.advance(8 * dayMs)
    utimesSync(keptFile, clock.now(), clock.now())
    const purged = await gateway?.purge()
    expect(purged?.conversations).toBe(1)
    expect(existsSync(file)).toBe(false)
    expect(existsSync(keptFile)).toBe(true)
  })
})
