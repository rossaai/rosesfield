import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  appDefinition,
  assetResponse,
  buildPath,
  characterResponse,
  type Run,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/remake/app"
import {
  type Recording,
  ReplayFetch,
} from "../../../../packages/catalog/test/motion/motion-replay"
import {
  FakeMediaTool,
  scoresOf,
} from "../../../../packages/catalog/test/remake/fake-media-tool"
import { comfyCloud, localEnv } from "../server-env"

const host = { host: "127.0.0.1:8787" }
const remake = appDefinition.parse(app)
const planUrl = "https://api.comfy.org/v2/models/vertexai/gemini-3.1-flash-lite"
const twoShots = scoresOf(240, [120])
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const edit = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73)

const plan = {
  shots: [
    { people: "none", words: "A quiet street.", cameraMove: null },
    { people: "none", words: "A pier at dusk.", cameraMove: null },
  ],
}

const planned: Recording = {
  method: "POST",
  url: planUrl,
  status: 200,
  json: {
    candidates: [{ content: { parts: [{ text: JSON.stringify(plan) }] } }],
  },
}

type Served = {
  gateway: LocalGateway
  replay: ReplayFetch
  clock: FixedClock
}

describe("a Remake run's plan on its record", () => {
  const folders: string[] = []
  const open: LocalGateway[] = []

  afterEach(async () => {
    for (const gateway of open.splice(0)) {
      gateway.jobs.stop()
      await gateway.close()
    }
    for (const folder of folders.splice(0)) {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  function newFolder(): string {
    const folder = mkdtempSync(join(tmpdir(), "rosesfield-remake-plan-"))
    folders.push(folder)
    return folder
  }

  function serve(folder: string, recordings: readonly Recording[]): Served {
    const replay = new ReplayFetch(recordings)
    const clock = new FixedClock({ now: new Date("2026-10-21T09:00:00.000Z") })
    const gateway = composeLocalGateway({
      env: localEnv(folder, comfyCloud("comfyui-owner")),
      apps: [remake],
      clock,
      platformRoot: null,
      fetch: replay.fetch,
      media: new FakeMediaTool(twoShots, true),
    })
    gateway.jobs.stop()
    open.push(gateway)
    return { gateway, replay, clock }
  }

  function call(served: Served, path: string, init: RequestInit = {}) {
    return served.gateway.app.request(path, {
      ...init,
      headers: { ...host, ...init.headers },
    })
  }

  function post(body: unknown, key: string): RequestInit {
    return {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(body),
    }
  }

  async function upload(served: Served, bytes: Uint8Array, mime: string) {
    const response = await call(served, routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": mime },
      body: bytes,
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function start(served: Served): Promise<Run> {
    const reference = await upload(served, edit, "video/mp4")
    const portrait = await upload(served, photo, "image/png")
    const saved = await call(
      served,
      routes.createCharacter.path,
      post({ name: "June", references: [portrait], notes: "" }, "character-1")
    )
    const character = characterResponse.parse(await saved.json()).character.id
    const response = await call(
      served,
      buildPath(routes.startRun.path, { appId: "remake" }),
      post(
        {
          inputs: {
            reference: [reference],
            character: [character],
            otherShots: "keep",
            seed: 41,
          },
        },
        "remake-plan-1"
      )
    )
    expect(response.status).toBe(202)
    return runResponse.parse(await response.json()).run
  }

  async function advance(served: Served, runId: string): Promise<boolean> {
    const { nextWakeMs } = await served.gateway.handlers.advanceRun.execute({
      runId: runIdFormat.parse(runId),
    })
    if (nextWakeMs !== null) {
      served.clock.advance(nextWakeMs)
    }
    return nextWakeMs !== null
  }

  async function read(served: Served, runId: string): Promise<Run> {
    const path = buildPath(routes.getRun.path, { runId })
    const response = await call(served, path)
    return runResponse.parse(await response.json()).run
  }

  it("serves the plan on GET /api/runs/:id once the plan turn ends, before any shot is made", async () => {
    const served = serve(newFolder(), [planned])
    const run = await start(served)
    await advance(served, run.id)
    expect((await read(served, run.id)).plan).toBeUndefined()
    await advance(served, run.id)
    const read1 = await read(served, run.id)
    expect(read1.status).not.toBe("done")
    expect(read1.outputs).toEqual([])
    expect(read1.plan).toEqual({
      shots: [
        {
          number: 1,
          startSeconds: 0,
          endSeconds: 5,
          route: "keep",
          model: null,
          credits: null,
          seed: null,
          words: null,
          cameraMove: null,
        },
        {
          number: 2,
          startSeconds: 5,
          endSeconds: 10,
          route: "keep",
          model: null,
          credits: null,
          seed: null,
          words: null,
          cameraMove: null,
        },
      ],
    })
    expect(served.replay.unused()).toEqual([])
  })

  it("resumes the run after a restart from its record, with no second plan turn, and keeps its plan", async () => {
    const folder = newFolder()
    const before = serve(folder, [planned])
    const run = await start(before)
    await advance(before, run.id)
    await advance(before, run.id)
    expect((await read(before, run.id)).plan?.shots).toHaveLength(2)
    const after = serve(folder, [])
    for (let step = 0; step < 10; step += 1) {
      if (!(await advance(after, run.id))) {
        break
      }
    }
    const done = await read(after, run.id)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(1)
    expect(done.plan?.shots.map((shot) => shot.route)).toEqual(["keep", "keep"])
    expect(after.replay.sent).toEqual([])
  })
})
