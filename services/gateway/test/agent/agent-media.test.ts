import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  conversationResponse,
  conversationRoutes,
  defaultChatModel,
} from "@rosesfield/agent"
import { assetResponse, buildPath, routes } from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { readServerEnv } from "#env"
import { keyHeaders } from "#session/visitor-keys"
import { pngOf } from "../../../../packages/agent/test/fixtures/media-files"
import {
  type RouterAnswer,
  replayRouter,
  textAnswer,
} from "../../../../packages/agent/test/fixtures/router-chat-answers"
import { fakeComfy } from "../fixtures/comfy-fetch"
import { captureLogs } from "../fixtures/leak-scan"
import { withRouterChat } from "../fixtures/router-chat-fetch"
import { type Seen, Visitor } from "../fixtures/visitor"
import { imageApp, sessionSecret, start } from "../sample-apps"

const mineKey = "comfyui-SENTINEL-mine-5e1a"
const theirsKey = "comfyui-SENTINEL-theirs-7c2b"

let gateway: LocalGateway | null = null
const folders: string[] = []

afterEach(async () => {
  await gateway?.close()
  gateway = null
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function readsOf(assetIds: readonly string[]): RouterAnswer {
  return {
    status: 200,
    body: {
      id: "gen-1760000000-media",
      object: "chat.completion",
      created: 1_760_000_000,
      model: defaultChatModel,
      choices: [
        {
          index: 0,
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: assetIds.map((assetId, index) => ({
              id: `call_read_${index}`,
              type: "function",
              function: {
                name: "read_asset",
                arguments: JSON.stringify({ assetId }),
              },
            })),
          },
        },
      ],
      usage: { prompt_tokens: 900, completion_tokens: 20, cost: 0.0001 },
    },
  }
}

async function uploaded(visitor: Visitor, png: Uint8Array): Promise<string> {
  const response = await visitor.call(routes.uploadAsset.path, {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: png,
  })
  return assetResponse.parse(await response.json()).asset.id
}

function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64")
}

describe("the media a visitor's agent reads in public mode", () => {
  it("comes from that visitor's library alone and goes to that visitor's key alone, and no log holds it", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-agent-media-"))
    folders.push(dataDir)
    const answers: RouterAnswer[] = []
    const router = replayRouter([
      () => answers.shift() ?? textAnswer(defaultChatModel, "Seen.", 0),
      () => answers.shift() ?? textAnswer(defaultChatModel, "Seen.", 0),
    ])
    gateway = composeLocalGateway({
      env: readServerEnv({
        MODE: "public",
        HOST: "0.0.0.0",
        SESSION_SECRET: sessionSecret,
        DATA_DIR: dataDir,
      }),
      apps: [imageApp()],
      clock: new FixedClock({ now: start }),
      platformRoot: null,
      fetch: withRouterChat(fakeComfy().fetch, router.fetch),
    })
    const seen: Seen[] = []
    const mine = new Visitor({
      app: gateway.app,
      keys: { [keyHeaders.engine]: mineKey },
      seen,
    })
    const theirs = new Visitor({
      app: gateway.app,
      keys: { [keyHeaders.engine]: theirsKey },
      seen,
    })
    const myPng = pngOf(6, 4)
    const theirPng = pngOf(5, 7)
    const myImage = await uploaded(mine, myPng)
    const theirImage = await uploaded(theirs, theirPng)
    answers.push(readsOf([theirImage, myImage]))
    const logs = captureLogs()

    try {
      const started = conversationResponse.parse(
        await (
          await mine.call(conversationRoutes.startConversation.path, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
          })
        ).json()
      ).conversation
      const answer = await mine.call(
        buildPath(conversationRoutes.sendMessage.path, {
          conversationId: started.id,
        }),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "Look at both" }),
        }
      )
      await answer.text()
    } finally {
      logs.restore()
    }

    const bodies = router.requests.map((request) =>
      JSON.stringify(request.body)
    )
    expect(
      router.requests.map((request) => request.headers.get("x-api-key"))
    ).toEqual([mineKey, mineKey])
    expect(bodies[1]).toContain(`data:image/png;base64,${base64(myPng)}`)
    expect(bodies.join("\n")).not.toContain(base64(theirPng))
    expect(bodies[1]).toContain("No asset has the id")
    expect(
      logs.lines.filter(
        (line) =>
          line.includes(base64(myPng)) ||
          line.includes(mineKey) ||
          line.includes(theirsKey)
      )
    ).toEqual([])
  })
})
